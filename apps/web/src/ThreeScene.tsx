import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import type { VRM } from '@pixiv/three-vrm';

export default function ThreeScene() {
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

    // ── Fallback cube ────────────────────────────────────────────────────────
    //    Visible while VRM is loading or if no model.vrm exists
    const fallbackGroup = new THREE.Group();
    const cubeGeo = new THREE.BoxGeometry(1, 1, 1);
    const cubeMat = new THREE.MeshStandardMaterial({ color: 0x7c6dfa, metalness: 0.4, roughness: 0.2 });
    const wireMat = new THREE.MeshBasicMaterial({ color: 0xa78bfa, wireframe: true, transparent: true, opacity: 0.2 });
    fallbackGroup.add(new THREE.Mesh(cubeGeo, cubeMat));
    fallbackGroup.add(new THREE.Mesh(cubeGeo, wireMat));
    fallbackGroup.position.set(0, 1.0, 0);
    scene.add(fallbackGroup);

    // ── VRM loader ────────────────────────────────────────────────────────────
    let currentVRM: VRM | null = null;

    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));

    loader.load(
      '/model.vrm',
      (gltf) => {
        const vrm = gltf.userData.vrm as VRM | undefined;
        if (!vrm) {
          console.warn('[ThreeScene] GLTF loaded but no VRM data found in userData.');
          return;
        }

        // Optimise and orient the model
        VRMUtils.removeUnnecessaryJoints(vrm.scene);
        VRMUtils.rotateVRM0(vrm);

        currentVRM = vrm;
        vrm.scene.rotation.y = Math.PI; // face toward +Z (camera)
        scene.add(vrm.scene);
        fallbackGroup.visible = false;

        console.log('[ThreeScene] VRM loaded ✅', vrm);
      },
      (xhr) => {
        if (xhr.total) {
          console.log(`[ThreeScene] VRM loading… ${Math.round((xhr.loaded / xhr.total) * 100)}%`);
        }
      },
      (error) => {
        // 404 / parse error — fallback cube stays visible
        console.warn('[ThreeScene] VRM load failed (put model.vrm in apps/web/public/):', error);
      },
    );

    // ── Animation loop ────────────────────────────────────────────────────────
    //   Use a single clock; read elapsed BEFORE getDelta() so it's never zero.
    const clock   = new THREE.Clock();
    let animId    = 0; // initialise to 0 — avoids TS2454 "used before assigned"

    const animate = () => {
      animId = requestAnimationFrame(animate);

      const elapsed = clock.elapsedTime;   // read first
      const delta   = clock.getDelta();    // then advance

      // Fallback cube rotation
      if (fallbackGroup.visible) {
        fallbackGroup.rotation.x = elapsed * 0.5;
        fallbackGroup.rotation.y = elapsed * 0.8;
      }

      // VRM update (spring bones, constraints, MToon, etc.)
      if (currentVRM) {
        currentVRM.update(delta);
        // Math.PI = face camera; oscillation adds gentle idle sway
        currentVRM.scene.rotation.y = Math.PI + Math.sin(elapsed * 0.4) * 0.3;
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

      if (currentVRM) {
        VRMUtils.deepDispose(currentVRM.scene);
      }
      cubeGeo.dispose();
      cubeMat.dispose();
      wireMat.dispose();
      renderer.dispose();

      if (mount.contains(canvas)) mount.removeChild(canvas);
    };
  }, []);

  return (
    <div
      ref={mountRef}
      style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}
    />
  );
}
