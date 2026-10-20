import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import * as THREE from 'three';

function Reactor() {
  const assembly = useRef<THREE.Group>(null);
  const positions = useMemo(() => {
    const coords: number[] = [];
    for (let i = 0; i < 160; i += 1) {
      const theta = i * 2.399963229728653;
      const y = 1 - (i / 159) * 2;
      const radius = Math.sqrt(Math.max(0, 1 - y * y));
      coords.push(Math.cos(theta) * radius * 2.75, y * 2.75, Math.sin(theta) * radius * 2.75);
    }
    return new Float32Array(coords);
  }, []);

  useFrame((state, delta) => {
    if (!assembly.current) return;
    assembly.current.rotation.y += delta * 0.085;
    assembly.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.16) * 0.13;
    assembly.current.rotation.x = 0.22 + Math.sin(state.clock.elapsedTime * 0.21) * 0.11;
  });

  return (
    <Float speed={1.2} rotationIntensity={0.08} floatIntensity={0.18}>
      <group ref={assembly}>
        <mesh>
          <icosahedronGeometry args={[2.05, 2]} />
          <meshBasicMaterial color="#64c9d4" wireframe transparent opacity={0.25} depthWrite={false} />
        </mesh>
        <mesh rotation={[1.1, 0.45, 0.2]}>
          <torusGeometry args={[2.57, 0.009, 6, 150]} />
          <meshBasicMaterial color="#9eeaf2" transparent opacity={0.62} />
        </mesh>
        <mesh rotation={[-0.35, 0.7, 0.16]}>
          <torusGeometry args={[2.36, 0.008, 6, 140]} />
          <meshBasicMaterial color="#b99e74" transparent opacity={0.34} />
        </mesh>
        <points>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          </bufferGeometry>
          <pointsMaterial color="#d5f6f7" size={0.055} sizeAttenuation transparent opacity={0.75} depthWrite={false} />
        </points>
        <mesh>
          <sphereGeometry args={[1.35, 24, 24]} />
          <meshBasicMaterial color="#17313c" transparent opacity={0.12} depthWrite={false} />
        </mesh>
      </group>
    </Float>
  );
}

export default function OrbScene() {
  return (
    <Canvas
      camera={{ position: [0, 0, 8.6], fov: 43, near: 0.1, far: 30 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
      style={{ pointerEvents: 'none' }}
      aria-label="Decorative rotating digital system sphere"
    >
      <ambientLight intensity={0.65} />
      <Reactor />
    </Canvas>
  );
}
