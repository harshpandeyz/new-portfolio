/**
 * HP//OS — Engineering Core (WebGL)
 * An abstract mechanical core that transforms as the visitor travels
 * through the system: compact (hero) → split (capabilities) →
 * constellation (projects) → archive lattice (credentials) →
 * collapsed terminal (contact).
 */
import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

export type CoreMode = "hero" | "core" | "projects" | "credentials" | "contact";

interface CoreSceneProps {
  mode: CoreMode;
  tier: "high" | "medium";
  reducedMotion?: boolean;
}

const MODE_PARAMS: Record<CoreMode, { spread: number; rings: number; speed: number; scale: number; hue: number }> = {
  hero: { spread: 0.35, rings: 3, speed: 0.45, scale: 1, hue: 0.58 },
  core: { spread: 1.15, rings: 4, speed: 0.32, scale: 1.12, hue: 0.55 },
  projects: { spread: 1.7, rings: 2, speed: 0.2, scale: 1.05, hue: 0.58 },
  credentials: { spread: 0.9, rings: 5, speed: 0.14, scale: 1.2, hue: 0.12 },
  contact: { spread: 0.2, rings: 1, speed: 0.5, scale: 0.8, hue: 0.55 },
};

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function Ring({ radius, tilt, speed, offset, color, paused }: { radius: number; tilt: number; speed: number; offset: number; color: THREE.Color; paused?: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }, delta) => {
    if (!ref.current || paused) return;
    ref.current.rotation.z += delta * speed;
    ref.current.rotation.x = tilt + Math.sin(offset + clock.elapsedTime * 0.12) * 0.08;
  });
  return (
    <mesh ref={ref} rotation={[tilt, offset, 0]}>
      <torusGeometry args={[radius, 0.006, 8, 128]} />
      <meshBasicMaterial color={color} transparent opacity={0.24} />
    </mesh>
  );
}

function Node({ position, color, size, paused }: { position: [number, number, number]; color: THREE.Color; size: number; paused?: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current || paused) return;
    const s = 1 + Math.sin(clock.elapsedTime * 2 + position[0] * 5) * 0.25;
    ref.current.scale.setScalar(s * 0.8);
  });
  return (
    <mesh ref={ref} position={position}>
      <sphereGeometry args={[size, 12, 12]} />
      <meshBasicMaterial color={color} transparent opacity={0.7} />
    </mesh>
  );
}

function Particles({ count, color, paused }: { count: number; color: THREE.Color; paused?: boolean }) {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 1.2 + Math.random() * 2.2;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.cos(phi) * 0.7;
      arr[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    return arr;
  }, [count]);

  useFrame((_, delta) => {
    if (ref.current && !paused) ref.current.rotation.y += delta * 0.03;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.014} color={color} transparent opacity={0.22} sizeAttenuation />
    </points>
  );
}

function Core({ mode, tier, paused }: { mode: CoreMode; tier: "high" | "medium"; paused?: boolean }) {
  const group = useRef<THREE.Group>(null);
  const inner = useRef<THREE.Mesh>(null);
  const nodesRef = useRef<THREE.Group>(null);
  const linesRef = useRef<THREE.Group>(null);
  const particlesRef = useRef<THREE.Group>(null);
  const target = MODE_PARAMS[mode];
  const current = useRef({ ...MODE_PARAMS.hero });
  const accent = useMemo(() => new THREE.Color("#0071e3"), []);
  const cyan = useMemo(() => new THREE.Color("#0a84ff"), []);
  const amber = useMemo(() => new THREE.Color("#8b8d92"), []);

  const nodeCount = tier === "high" ? 7 : 4;
  const particleCount = tier === "high" ? 150 : 60;

  const nodes = useMemo(() => {
    const arr: { pos: [number, number, number]; color: THREE.Color }[] = [];
    for (let i = 0; i < nodeCount; i++) {
      const phi = (i / nodeCount) * Math.PI * 2;
      arr.push({
        pos: [Math.cos(phi) * 1.6, Math.sin(i * 1.7) * 0.7, Math.sin(phi) * 1.6],
        color: i % 3 === 0 ? cyan : i % 3 === 1 ? accent : amber,
      });
    }
    return arr;
  }, [nodeCount, accent, cyan, amber]);

  useFrame((state, delta) => {
    if (paused) return;
    const c = current.current;
    const t = 1 - Math.pow(0.02, delta); // smooth approach
    c.spread = lerp(c.spread, target.spread, t);
    c.speed = lerp(c.speed, target.speed, t);
    c.scale = lerp(c.scale, target.scale, t);

    if (group.current) {
      group.current.rotation.y += delta * 0.12 * c.speed;
      group.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.15) * 0.08 + state.pointer.y * 0.04;
      group.current.rotation.z = state.pointer.x * 0.03;
      group.current.scale.setScalar(c.scale);
      group.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.05;
    }
    if (inner.current) {
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 1.4) * 0.03;
      inner.current.scale.setScalar(pulse);
      inner.current.rotation.y -= delta * 0.3 * c.speed;
      inner.current.rotation.x += delta * 0.1;
    }
    if (nodesRef.current) nodesRef.current.scale.setScalar(c.spread);
    if (linesRef.current) linesRef.current.scale.setScalar(c.spread);
    if (particlesRef.current) particlesRef.current.scale.setScalar(c.spread);
  });

  return (
    <group ref={group}>
      {/* inner wireframe core */}
      <mesh ref={inner}>
        <icosahedronGeometry args={[0.72, 1]} />
      <meshBasicMaterial color={accent} wireframe transparent opacity={0.28} />
      </mesh>
      {/* solid inner glow */}
      <mesh>
        <icosahedronGeometry args={[0.4, 2]} />
        <meshBasicMaterial color="#dbeeff" transparent opacity={0.7} />
      </mesh>
      {/* rings */}
      <Ring radius={1.05} tilt={1.1} speed={0.5} offset={0} color={accent} paused={paused} />
      <Ring radius={1.3} tilt={-0.6} speed={-0.35} offset={1.4} color={cyan} paused={paused} />
      {target.rings >= 3 && <Ring radius={1.55} tilt={0.35} speed={0.22} offset={2.6} color={accent} paused={paused} />}
      {target.rings >= 4 && <Ring radius={1.8} tilt={-1.2} speed={-0.16} offset={0.8} color={cyan} paused={paused} />}
      {target.rings >= 5 && <Ring radius={2.0} tilt={1.5} speed={0.1} offset={3.4} color={amber} paused={paused} />}
      {/* orbital nodes */}
      <group ref={nodesRef}>
        {nodes.map((n, i) => (
          <group key={i} position={n.pos}>
            <Node position={[0, 0, 0]} color={n.color} size={0.035} paused={paused} />
          </group>
        ))}
      </group>
      {/* connecting lines to nodes */}
      {target.spread > 0.8 && (
        <group ref={linesRef}>
          {nodes.slice(0, tier === "high" ? 6 : 3).map((n, i) => (
            <line key={`l${i}`}>
              <bufferGeometry
                attach="geometry"
                onUpdate={(geo) => {
                  geo.setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(n.pos[0], n.pos[1], n.pos[2])]);
                }}
              />
              <lineBasicMaterial color={n.color} transparent opacity={0.09} />
            </line>
          ))}
        </group>
      )}
      <group ref={particlesRef}>
        <Particles count={particleCount} color={accent} paused={paused} />
      </group>
    </group>
  );
}

export default function CoreScene({ mode, tier, reducedMotion = false }: CoreSceneProps) {
  const [visible, setVisible] = useState(() => document.visibilityState === "visible");

  useEffect(() => {
    const onVisibilityChange = () => setVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  return (
    <Canvas
      camera={{ position: [0, 0.3, 4.2], fov: 42 }}
      dpr={tier === "high" ? [1, 1.5] : [1, 1.25]}
      gl={{ antialias: tier === "high", alpha: true, powerPreference: "low-power" }}
      frameloop={visible ? "always" : "never"}
      style={{ background: "transparent" }}
      aria-hidden="true"
    >
      <Core mode={mode} tier={tier} paused={reducedMotion} />
    </Canvas>
  );
}
