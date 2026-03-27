// virtual-speaker-web\apps\web\src\ThreeScene.tsx

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import { VRMAnimationLoaderPlugin, createVRMAnimationClip } from '@pixiv/three-vrm-animation';
import type { VRM } from '@pixiv/three-vrm';

// Export types as expected by App.tsx
export type PlayAnimationFn = (url: string) => void;
export type StopAnimationFn = () => void;
export type FocusCameraFn = (isFocused: boolean) => void;
export type SpeakFn = (text: string, voice: string) => void;

interface ThreeSceneProps {
  modelUrl?: string;
  onReady?: (
    playFn: PlayAnimationFn,
    stopFn: StopAnimationFn,
    focusFn: FocusCameraFn,
    speakFn: SpeakFn
  ) => void;
}

export default function ThreeScene({ onReady, modelUrl = '/models/model.vrm' }: ThreeSceneProps) {
  const mountRef = useRef<HTMLDivElement>(null);

  // Refs to hold persistent Three.js objects
  const sceneRef = useRef<THREE.Scene | null>(null);
  const currentVRMRef = useRef<VRM | null>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const activeActionRef = useRef<THREE.AnimationAction | null>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const lipSyncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const animationsCacheRef = useRef<{ [url: string]: THREE.AnimationClip }>({});
  const lastTimeRef = useRef(performance.now());
  const playAnimationRef = useRef<PlayAnimationFn | null>(null);
  const stopAnimationRef = useRef<StopAnimationFn | null>(null);
  const focusCameraRef = useRef<FocusCameraFn | null>(null);
  const speakRef = useRef<SpeakFn | null>(null);

  // Loaders
  const loader = new GLTFLoader();
  loader.register((parser) => new VRMLoaderPlugin(parser));
  const vrmaLoader = new GLTFLoader();
  vrmaLoader.register((parser) => new VRMAnimationLoaderPlugin(parser));

  // 1. Initial Scene Setup
  useEffect(() => {
    const mount = mountRef.current!;
    const getSize = () => ({
      w: mount.clientWidth || window.innerWidth,
      h: mount.clientHeight || window.innerHeight,
    });
    const { w, h } = getSize();

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    const canvas = renderer.domElement;
    canvas.style.position = 'absolute';
    canvas.style.inset = '0';
    canvas.style.display = 'block';
    mount.appendChild(canvas);

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(30, w / h, 0.1, 50);
    const idleCameraPos = new THREE.Vector3(0, 1.4, 4);
    const focusedCameraPos = new THREE.Vector3(0, 1.5, 1.2);
    camera.position.copy(idleCameraPos);
    camera.lookAt(0, 1.0, 0);

    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambient);
    const dirLight = new THREE.DirectionalLight(0xffffff, 2.0);
    dirLight.position.set(2, 4, 3);
    dirLight.castShadow = true;
    scene.add(dirLight);
    const fillLight = new THREE.DirectionalLight(0xa78bfa, 0.8);
    fillLight.position.set(-3, 1, -2);
    scene.add(fillLight);

    // Common functions
    playAnimationRef.current = (url: string) => {
      if (!currentVRMRef.current) return;
      const executePlay = (clip: THREE.AnimationClip) => {
        if (!mixerRef.current) {
          mixerRef.current = new THREE.AnimationMixer(currentVRMRef.current!.scene);
        }
        if (activeActionRef.current) activeActionRef.current.fadeOut(0.3);
        const action = mixerRef.current.clipAction(clip);
        action.reset().fadeIn(0.3).play();
        activeActionRef.current = action;
      };

      if (animationsCacheRef.current[url]) {
        executePlay(animationsCacheRef.current[url]);
      } else {
        vrmaLoader.load(url, (gltf: any) => {
          const vrmAnimation = gltf.userData.vrmAnimations?.[0];
          if (!vrmAnimation) return;
          const clip = createVRMAnimationClip(vrmAnimation, currentVRMRef.current!);
          animationsCacheRef.current[url] = clip;
          executePlay(clip);
        });
      }
    };

    stopAnimationRef.current = () => {
      if (activeActionRef.current) {
        activeActionRef.current.fadeOut(0.5);
        activeActionRef.current = null;
      }
    };

    focusCameraRef.current = (isFocused: boolean) => {
      const targetPos = isFocused ? focusedCameraPos : idleCameraPos;
      camera.position.copy(targetPos);
      camera.lookAt(0, 1.3, 0);
    };

    speakRef.current = async (text: string, voice: string) => {
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
        if (lipSyncIntervalRef.current) clearInterval(lipSyncIntervalRef.current);
        if (currentVRMRef.current) currentVRMRef.current.expressionManager?.setValue('aa', 0);
      }
      try {
        const response = await fetch('http://localhost:3001/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, voice })
        });
        const data = await response.json();
        const audioUrl = data.async;
        if (!audioUrl) return;

        const attemptPlay = (retries = 0) => {
          const audio = new Audio(audioUrl);
          activeAudioRef.current = audio;
          audio.onplay = () => {
            if (currentVRMRef.current) {
              lipSyncIntervalRef.current = setInterval(() => {
                const randomOpen = 0.2 + Math.random() * 0.6;
                currentVRMRef.current!.expressionManager?.setValue('aa', randomOpen);
              }, 150);
            }
          };
          audio.onended = () => {
            if (lipSyncIntervalRef.current) clearInterval(lipSyncIntervalRef.current);
            if (currentVRMRef.current) currentVRMRef.current!.expressionManager?.setValue('aa', 0);
          };
          audio.onerror = () => {
            if (retries < 5) setTimeout(() => attemptPlay(retries + 1), 500);
          };
          audio.play();
        };
        attemptPlay();
      } catch (e) {
        console.error("TTS Error", e);
      }
    };

    let animId = 0;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      const currentTime = performance.now();
      const delta = (currentTime - lastTimeRef.current) * 0.001;
      lastTimeRef.current = currentTime;

      if (currentVRMRef.current) {
        currentVRMRef.current.update(delta);
        const elapsed = currentTime * 0.001;
        currentVRMRef.current.scene.rotation.y = Math.PI + Math.sin(elapsed * 0.4) * 0.1;
      }
      if (mixerRef.current) mixerRef.current.update(delta);
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      const { w: rw, h: rh } = getSize();
      camera.aspect = rw / rh;
      camera.updateProjectionMatrix();
      renderer.setSize(rw, rh);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (mount.contains(canvas)) mount.removeChild(canvas);
    };
  }, []);

  // 2. Model Loading/Switching
  useEffect(() => {
    if (!sceneRef.current) return;
    const scene = sceneRef.current;

    // Cleanup previous model
    if (currentVRMRef.current) {
      scene.remove(currentVRMRef.current.scene);
      VRMUtils.deepDispose(currentVRMRef.current.scene);
      currentVRMRef.current = null;
      mixerRef.current = null;
      activeActionRef.current = null;
    }

    loader.load(
      modelUrl,
      (gltf: any) => {
        const vrm = gltf.userData.vrm as VRM | undefined;
        if (!vrm) return;
        VRMUtils.combineSkeletons(vrm.scene);
        VRMUtils.rotateVRM0(vrm);
        currentVRMRef.current = vrm;
        vrm.scene.rotation.y = Math.PI;
        scene.add(vrm.scene);
        console.log(`[ThreeScene] Model loaded: ${modelUrl}`);

        if (onReady && playAnimationRef.current && stopAnimationRef.current && focusCameraRef.current && speakRef.current) {
          onReady(playAnimationRef.current, stopAnimationRef.current, focusCameraRef.current, speakRef.current);
        }
      },
      undefined,
      (err) => console.error(`[ThreeScene] Load failed: ${modelUrl}`, err)
    );
  }, [modelUrl, onReady]);

  return (
    <div
      ref={mountRef}
      style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}
    />
  );
}
