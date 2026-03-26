import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import type { VRM } from '@pixiv/three-vrm';
import { VRMAnimationLoaderPlugin, createVRMAnimationClip } from '@pixiv/three-vrm-animation';

// ──────────────────────────────────────────────────────────────────────────────
// Types exposed to the outside world
// ──────────────────────────────────────────────────────────────────────────────
export type PlayAnimationFn = (vrmaPath: string) => void;
export type StopAnimationFn = () => void;

interface ThreeSceneProps {
  onReady?: (playAnimation: PlayAnimationFn, stopAnimation: StopAnimationFn) => void;
}

export default function ThreeScene({ onReady }: ThreeSceneProps) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current!;

    // ── Dimensions ────────────────────────────────────────────────────────────
    const getSize = () => ({
      w: mount.clientWidth  || window.innerWidth,
      h: mount.clientHeight || window.innerHeight,
    });
    const { w, h } = getSize();

    // ── Renderer ──────────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;

    const canvas = renderer.domElement;
    canvas.style.position = 'absolute';
    canvas.style.inset    = '0';
    canvas.style.display  = 'block';
    mount.appendChild(canvas);

    // ── Scene ─────────────────────────────────────────────────────────────────
    const scene = new THREE.Scene();

    // ── Camera ────────────────────────────────────────────────────────────────
    const camera = new THREE.PerspectiveCamera(30, w / h, 0.1, 50);
    camera.position.set(0, 1.4, 4);
    camera.lookAt(0, 1.0, 0);

    // ── Lights ────────────────────────────────────────────────────────────────
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 2.0);
    dirLight.position.set(2, 4, 3);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0xa78bfa, 0.8);
    fillLight.position.set(-3, 1, -2);
    scene.add(fillLight);

    // ── Fallback cube ─────────────────────────────────────────────────────────
    const fallbackGroup = new THREE.Group();
    const cubeGeo = new THREE.BoxGeometry(1, 1, 1);
    const cubeMat = new THREE.MeshStandardMaterial({ color: 0x7c6dfa, metalness: 0.4, roughness: 0.2 });
    const wireMat = new THREE.MeshBasicMaterial({ color: 0xa78bfa, wireframe: true, transparent: true, opacity: 0.2 });
    fallbackGroup.add(new THREE.Mesh(cubeGeo, cubeMat));
    fallbackGroup.add(new THREE.Mesh(cubeGeo, wireMat));
    fallbackGroup.position.set(0, 1.0, 0);
    scene.add(fallbackGroup);

    // ── State ─────────────────────────────────────────────────────────────────
    let currentVRM: VRM | null = null;
    let mixer: THREE.AnimationMixer | null = null;
    let currentAction: THREE.AnimationAction | null = null;

    // ── Loaders ───────────────────────────────────────────────────────────────
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));
    loader.register((parser) => new VRMAnimationLoaderPlugin(parser));

    // ── Load VRM ──────────────────────────────────────────────────────────────
    loader.load(
      '/models/model.vrm',
      (gltf) => {
        const vrm = gltf.userData.vrm as VRM | undefined;
        if (!vrm) {
          console.warn('[ThreeScene] No VRM data in userData.');
          return;
        }

        VRMUtils.removeUnnecessaryJoints(vrm.scene);
        VRMUtils.rotateVRM0(vrm);

        currentVRM = vrm;
        vrm.scene.rotation.y = Math.PI;
        scene.add(vrm.scene);
        fallbackGroup.visible = false;

        mixer = new THREE.AnimationMixer(vrm.scene);

        console.log('[ThreeScene] VRM loaded ✅');

        // Notify parent that scene is ready
        onReady?.(playAnimation, stopAnimation);
      },
      (xhr) => {
        if (xhr.total) {
          console.log(`[ThreeScene] VRM loading… ${Math.round((xhr.loaded / xhr.total) * 100)}%`);
        }
      },
      (error) => {
        console.warn('[ThreeScene] VRM load failed:', error);
      },
    );

    // ── Play VRMA animation ───────────────────────────────────────────────────
    const playAnimation = (vrmaPath: string) => {
      if (!currentVRM || !mixer) return;

      loader.load(
        vrmaPath,
        (gltf) => {
          const vrmAnimations = gltf.userData.vrmAnimations as unknown[] | undefined;
          const vrmAnimation = vrmAnimations?.[0];
          if (!vrmAnimation) {
            console.warn('[ThreeScene] No VRM animation data in', vrmaPath);
            return;
          }

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const clip = createVRMAnimationClip(vrmAnimation as any, currentVRM!);

          // Fade out old action
          if (currentAction) {
            currentAction.fadeOut(0.3);
          }

          // Play new action
          const action = mixer!.clipAction(clip);
          action.reset().fadeIn(0.3).play();
          currentAction = action;

          console.log('[ThreeScene] Playing animation:', vrmaPath);
        },
        undefined,
        (error) => {
          console.warn('[ThreeScene] Failed to load VRMA:', vrmaPath, error);
        },
      );
    };

    // ── Stop current animation ────────────────────────────────────────────────
    const stopAnimation = () => {
      if (!currentAction) return;
      currentAction.fadeOut(0.5);
      // We don't null it immediately so it can finish fading out, 
      // but the idle sway logic will take over if we check .isRunning()
      setTimeout(() => {
        if (currentAction && !currentAction.isRunning()) {
          currentAction = null;
        }
      }, 500);
      console.log('[ThreeScene] Stopping animation');
    };

    // ── Animation loop ────────────────────────────────────────────────────────
    const clock = new THREE.Clock();
    let animId = 0;

    const animate = () => {
      animId = requestAnimationFrame(animate);

      const elapsed = clock.elapsedTime;
      const delta   = clock.getDelta();

      if (fallbackGroup.visible) {
        fallbackGroup.rotation.x = elapsed * 0.5;
        fallbackGroup.rotation.y = elapsed * 0.8;
      }

      if (currentVRM) {
        mixer?.update(delta);
        currentVRM.update(delta);
        // Gentle idle sway only when no animation is active
        if (!currentAction || !currentAction.isRunning()) {
          currentVRM.scene.rotation.y = Math.PI + Math.sin(elapsed * 0.4) * 0.3;
        }
      }

      renderer.render(scene, camera);
    };
    animate();

    // ── Resize handler ────────────────────────────────────────────────────────
    const handleResize = () => {
      const { w: rw, h: rh } = getSize();
      camera.aspect = rw / rh;
      camera.updateProjectionMatrix();
      renderer.setSize(rw, rh);
    };
    window.addEventListener('resize', handleResize);

    // ── Cleanup ───────────────────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);

      if (currentVRM) VRMUtils.deepDispose(currentVRM.scene);
      cubeGeo.dispose();
      cubeMat.dispose();
      wireMat.dispose();
      renderer.dispose();

      if (mount.contains(canvas)) mount.removeChild(canvas);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={mountRef}
      style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}
    />
  );
}
