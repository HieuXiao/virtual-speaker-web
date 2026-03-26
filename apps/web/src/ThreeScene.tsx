import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function ThreeScene() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current!;

    // Use window dimensions as fallback — clientWidth is 0 before browser layout
    const width  = mount.clientWidth  || window.innerWidth;
    const height = mount.clientHeight || window.innerHeight;

    // --- Renderer ---
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Force canvas to fill the wrapper absolutely
    const canvas = renderer.domElement;
    canvas.style.position = 'absolute';
    canvas.style.inset = '0';
    canvas.style.display = 'block';
    mount.appendChild(canvas);

    // --- Scene ---
    const scene = new THREE.Scene();

    // --- Camera ---
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100);
    camera.position.set(0, 0, 4);

    // --- Lights ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xa78bfa, 1.5);
    dirLight.position.set(5, 5, 5);
    scene.add(dirLight);

    const pointLight = new THREE.PointLight(0x7c6dfa, 2, 10);
    pointLight.position.set(-3, -2, 2);
    scene.add(pointLight);

    // --- Cube ---
    const geometry = new THREE.BoxGeometry(1.4, 1.4, 1.4);
    const material = new THREE.MeshStandardMaterial({
      color: 0x7c6dfa,
      metalness: 0.4,
      roughness: 0.2,
    });
    const cube = new THREE.Mesh(geometry, material);
    scene.add(cube);

    // --- Wireframe overlay ---
    const wireMaterial = new THREE.MeshBasicMaterial({
      color: 0xa78bfa,
      wireframe: true,
      transparent: true,
      opacity: 0.15,
    });
    const wireframe = new THREE.Mesh(geometry, wireMaterial);
    scene.add(wireframe);

    // --- Animation loop ---
    let animId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();
      cube.rotation.x      = elapsed * 0.5;
      cube.rotation.y      = elapsed * 0.8;
      wireframe.rotation.copy(cube.rotation);
      renderer.render(scene, camera);
    };
    animate();

    // --- Resize handler ---
    const handleResize = () => {
      const w = mount.clientWidth  || window.innerWidth;
      const h = mount.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup — guard removeChild for React StrictMode double-invoke
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      wireMaterial.dispose();
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
