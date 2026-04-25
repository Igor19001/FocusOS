import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

function Particles({ count }: { count: number }) {
  const pointsRef = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const data = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      data[i * 3] = (Math.random() - 0.5) * 18;
      data[i * 3 + 1] = (Math.random() - 0.5) * 10;
      data[i * 3 + 2] = (Math.random() - 0.5) * 16;
    }
    return data;
  }, []);

  useFrame((state) => {
    if (!pointsRef.current) return;
    pointsRef.current.rotation.y = state.clock.elapsedTime * 0.03;
    pointsRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.15) * 0.08;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial color="#22d3ee" size={0.025} transparent opacity={0.45} depthWrite={false} />
    </points>
  );
}

export default function BackgroundScene() {
  const [particleCount, setParticleCount] = useState(900);

  useEffect(() => {
    const updateCount = () => setParticleCount(window.innerWidth < 640 ? 420 : 900);
    updateCount();
    window.addEventListener("resize", updateCount);
    return () => window.removeEventListener("resize", updateCount);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 opacity-55 sm:opacity-70">
      <Canvas camera={{ position: [0, 0, 8], fov: 55 }}>
        <ambientLight intensity={0.3} />
        <Particles count={particleCount} />
      </Canvas>
    </div>
  );
}
