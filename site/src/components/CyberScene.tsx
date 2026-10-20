import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Line } from '@react-three/drei';
import * as THREE from 'three';

const BLUE = '#74bfff';
const CYAN = '#64ecd1';

function CircuitCore() {
  const group = useRef<THREE.Group>(null);
  const torusOuter = useRef<THREE.Mesh>(null);
  const inner = useRef<THREE.Mesh>(null);

  useFrame(({ clock }, delta) => {
    if (!group.current) return;
    const t = clock.getElapsedTime();
    group.current.rotation.y += delta * 0.13;
    group.current.rotation.z = Math.sin(t * 0.18) * 0.11;
    if (torusOuter.current) torusOuter.current.rotation.x += delta * 0.18;
    if (inner.current) inner.current.rotation.y -= delta * 0.22;
  });

  return (
    <Float speed={1.2} rotationIntensity={0.1} floatIntensity={0.18}>
      <group ref={group} rotation={[0.24, 0.2, 0]}>
        <mesh>
          <icosahedronGeometry args={[1.5, 2]} />
          <meshBasicMaterial color={BLUE} wireframe transparent opacity={0.25} />
        </mesh>
        <mesh ref={inner}>
          <icosahedronGeometry args={[1.27, 1]} />
          <meshBasicMaterial color={CYAN} wireframe transparent opacity={0.12} />
        </mesh>
        <mesh ref={torusOuter} rotation={[Math.PI / 2.8, 0.25, 0.1]}>
          <torusGeometry args={[1.92, 0.014, 8, 128]} />
          <meshBasicMaterial color={BLUE} transparent opacity={0.60} />
        </mesh>
        <mesh rotation={[0.4, Math.PI / 1.7, 0]}>
          <torusGeometry args={[1.75, 0.006, 6, 128]} />
          <meshBasicMaterial color={CYAN} transparent opacity={0.28} />
        </mesh>
        <mesh>
          <sphereGeometry args={[0.10, 16, 16]} />
          <meshBasicMaterial color="#b4f9ed" />
        </mesh>
        <Line points={[[0, -2.2, 0], [0, 2.2, 0]]} color={BLUE} transparent opacity={0.17} lineWidth={1} />
      </group>
    </Float>
  );
}

function ParticleField() {
  const points = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const result = new Float32Array(140 * 3);
    for (let i = 0; i < 140; i++) {
      const angle = i * 2.399963229728653;
      const radius = 2.45 + (i % 17) * 0.13;
      result[i * 3] = Math.cos(angle) * radius;
      result[i * 3 + 1] = Math.sin(angle * 1.6) * 2.4;
      result[i * 3 + 2] = Math.sin(angle) * radius - 0.8;
    }
    return result;
  }, []);
  useFrame((_, delta) => {
    if (points.current) points.current.rotation.y += delta * 0.006;
  });
  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color={BLUE} size={0.027} sizeAttenuation transparent opacity={0.7} />
    </points>
  );
}

export default function CyberScene() {
  return (
    <div className="cyber-canvas" aria-hidden="true">
      <Canvas dpr={[1, 1.65]} camera={{ position: [0, 0, 6.6], fov: 37 }} gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}>
        <ambientLight intensity={0.5} />
        <CircuitCore />
        <ParticleField />
      </Canvas>
    </div>
  );
}
