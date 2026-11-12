"use client";

/**
 * TwinUniverse — TwinPad's signature hero scene.
 *
 * A hand-built cartoon crypto cosmos (no external model files): floating
 * candy islands, drifting clouds, spinning coins, two launch portals
 * (Route 01 — Pump.fun, Route 02 — Raydium LaunchLab), the Twinny mascot
 * and a pair of rocket fly-bys.
 *
 * Performance budget: every mesh is a low-segment primitive, shadows are
 * disabled, DPR is clamped, and the canvas is pointer-transparent so it can
 * never block the hero's buttons.
 */

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { AdaptiveDpr, Float, Sparkles } from "@react-three/drei";
import * as THREE from "three";
import { PORTAL_COLORS, TP3D, type PortalVariant } from "./scene-support";

/* ------------------------------------------------------------------ */
/* Small reusable pieces                                               */
/* ------------------------------------------------------------------ */

function Coin({ color = TP3D.yellow, rim = TP3D.gold }: { color?: string; rim?: string }) {
  return (
    <group>
      <mesh>
        <cylinderGeometry args={[0.32, 0.32, 0.07, 24]} />
        <meshStandardMaterial color={color} roughness={0.35} metalness={0.35} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.3, 0.045, 10, 28]} />
        <meshStandardMaterial
          color={rim}
          roughness={0.3}
          metalness={0.5}
          emissive={rim}
          emissiveIntensity={0.25}
        />
      </mesh>
    </group>
  );
}

function Cloud({ scale = 1 }: { scale?: number }) {
  const puffs = useMemo(
    () =>
      [
        [0, 0, 0, 0.5],
        [0.55, -0.06, 0.1, 0.38],
        [-0.55, -0.04, 0.05, 0.34],
        [0.2, 0.22, -0.05, 0.3],
      ] as const,
    [],
  );
  return (
    <group scale={scale}>
      {puffs.map(([x, y, z, r], i) => (
        <mesh key={i} position={[x, y, z]}>
          <sphereGeometry args={[r, 18, 14]} />
          <meshStandardMaterial color={TP3D.cloud} roughness={1} transparent opacity={0.92} />
        </mesh>
      ))}
    </group>
  );
}

function Tree({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[0.05, 0.07, 0.24, 8]} />
        <meshStandardMaterial color="#B08D57" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.42, 0]}>
        <sphereGeometry args={[0.2, 14, 12]} />
        <meshStandardMaterial color={TP3D.grass} roughness={0.8} />
      </mesh>
    </group>
  );
}

function FloatingIsland({
  position,
  scale = 1,
  variant = 0,
}: {
  position: [number, number, number];
  scale?: number;
  variant?: number;
}) {
  return (
    <Float speed={1.4} rotationIntensity={0.25} floatIntensity={0.9} floatingRange={[0.18, 0.3]}>
      <group position={position} scale={scale}>
        {/* rocky underside */}
        <mesh position={[0, -0.42, 0]}>
          <cylinderGeometry args={[1.15, 0.35, 0.95, 7]} />
          <meshStandardMaterial color={TP3D.rock} roughness={0.95} flatShading />
        </mesh>
        {/* grass top */}
        <mesh position={[0, 0.06, 0]}>
          <cylinderGeometry args={[1.22, 1.2, 0.22, 7]} />
          <meshStandardMaterial color={TP3D.grass} roughness={0.85} flatShading />
        </mesh>
        {variant === 0 && <Tree position={[0.55, 0.16, 0.25]} />}
        {variant === 1 && (
          <group position={[-0.45, 0.17, -0.2]}>
            {/* tiny candy house */}
            <mesh>
              <boxGeometry args={[0.34, 0.3, 0.3]} />
              <meshStandardMaterial color="#FDE68A" roughness={0.8} />
            </mesh>
            <mesh position={[0, 0.26, 0]} rotation={[0, Math.PI / 4, 0]}>
              <coneGeometry args={[0.3, 0.26, 4]} />
              <meshStandardMaterial color={TP3D.pink} roughness={0.75} />
            </mesh>
          </group>
        )}
        {variant === 2 && (
          <group position={[0, 0.35, 0]} rotation={[0.4, 0, 0]} scale={0.7}>
            <Coin color={TP3D.cyan} rim={TP3D.cyanDeep} />
          </group>
        )}
      </group>
    </Float>
  );
}

function Rocket({
  radius = 5.4,
  height = 1.2,
  speed = 0.24,
  offset = 0,
}: {
  radius: number;
  height: number;
  speed: number;
  offset: number;
}) {
  const group = useRef<THREE.Group>(null);
  const flame = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;
    const t = clock.elapsedTime * speed + offset;
    g.position.set(Math.cos(t) * radius, height + Math.sin(t * 2.3) * 0.35, Math.sin(t) * radius * 0.62);
    // Face the direction of travel.
    g.rotation.y = -t + Math.PI / 2;
    g.rotation.z = 0.42;
    if (flame.current) {
      const s = 0.85 + Math.sin(clock.elapsedTime * 14 + offset) * 0.2;
      flame.current.scale.set(s, 1 + Math.sin(clock.elapsedTime * 17 + offset) * 0.25, s);
    }
  });

  return (
    <group ref={group}>
      {/* body */}
      <mesh>
        <capsuleGeometry args={[0.16, 0.5, 6, 12]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.35} />
      </mesh>
      {/* nose */}
      <mesh position={[0, 0.44, 0]}>
        <coneGeometry args={[0.16, 0.3, 12]} />
        <meshStandardMaterial color={TP3D.purple} roughness={0.4} />
      </mesh>
      {/* window */}
      <mesh position={[0, 0.1, 0.13]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.075, 0.022, 8, 16]} />
        <meshStandardMaterial color={TP3D.cyan} emissive={TP3D.cyan} emissiveIntensity={0.6} />
      </mesh>
      {/* fins */}
      {[0, 1, 2].map((i) => (
        <mesh key={i} rotation={[0, (i * Math.PI * 2) / 3, 0]} position={[0, -0.18, 0]}>
          <boxGeometry args={[0.04, 0.22, 0.18]} />
          <meshStandardMaterial color={TP3D.pink} roughness={0.5} />
        </mesh>
      ))}
      {/* flame */}
      <mesh ref={flame} position={[0, -0.5, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.09, 0.3, 10]} />
        <meshBasicMaterial color={TP3D.flame} transparent opacity={0.9} />
      </mesh>
    </group>
  );
}

function Portal({
  variant,
  position,
  scale = 1,
}: {
  variant: PortalVariant;
  position: [number, number, number];
  scale?: number;
}) {
  const colors = PORTAL_COLORS[variant];
  const ringA = useRef<THREE.Mesh>(null);
  const ringB = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (ringA.current) ringA.current.rotation.z = clock.elapsedTime * 0.4;
    if (ringB.current) ringB.current.rotation.z = -clock.elapsedTime * 0.28;
  });

  return (
    <Float speed={1.1} rotationIntensity={0.12} floatIntensity={0.55} floatingRange={[0.1, 0.24]}>
      <group position={position} scale={scale}>
        <mesh ref={ringA}>
          <torusGeometry args={[1.05, 0.13, 14, 44]} />
          <meshStandardMaterial
            color={colors.ring}
            emissive={colors.ring}
            emissiveIntensity={0.85}
            roughness={0.25}
          />
        </mesh>
        <mesh ref={ringB} rotation={[0.35, 0, 0]}>
          <torusGeometry args={[0.82, 0.05, 10, 40]} />
          <meshStandardMaterial color={colors.accent} emissive={colors.accent} emissiveIntensity={0.9} />
        </mesh>
        {/* swirling disc */}
        <mesh>
          <circleGeometry args={[0.92, 40]} />
          <meshBasicMaterial color={colors.glow} transparent opacity={0.22} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 0, 0.02]}>
          <ringGeometry args={[0.42, 0.58, 36]} />
          <meshBasicMaterial color={colors.accent} transparent opacity={0.35} side={THREE.DoubleSide} />
        </mesh>
        <Sparkles count={14} scale={2.6} size={2.4} speed={0.5} color={colors.ring} />
      </group>
    </Float>
  );
}

/** Twinny — the TwinPad mascot. A round little explorer with a twin-jet pack. */
function Twinny({ position }: { position: [number, number, number] }) {
  const root = useRef<THREE.Group>(null);
  const glint = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const g = root.current;
    if (!g) return;
    g.position.y = position[1] + Math.sin(clock.elapsedTime * 1.4) * 0.12;
    g.rotation.y = Math.sin(clock.elapsedTime * 0.6) * 0.35;
    if (glint.current) {
      // Blink: periodically squash the animated eye glint.
      const phase = (clock.elapsedTime % 3.4) / 3.4;
      const blink = phase > 0.96 ? 0.15 : 1;
      glint.current.scale.set(1, blink, 1);
    }
  });

  return (
    <group ref={root} position={position}>
      {/* body */}
      <mesh>
        <sphereGeometry args={[0.62, 28, 24]} />
        <meshStandardMaterial color="#F5F3FF" roughness={0.55} />
      </mesh>
      {/* visor */}
      <mesh position={[0, 0.08, 0.5]} scale={[1, 0.82, 0.6]}>
        <sphereGeometry args={[0.3, 24, 20]} />
        <meshStandardMaterial color={TP3D.ink} roughness={0.15} metalness={0.2} />
      </mesh>
      {/* eye glints (one is animated to blink) */}
      <mesh ref={glint} position={[-0.1, 0.12, 0.72]}>
        <sphereGeometry args={[0.055, 10, 8]} />
        <meshBasicMaterial color={TP3D.cyan} />
      </mesh>
      <mesh position={[0.1, 0.12, 0.72]}>
        <sphereGeometry args={[0.055, 10, 8]} />
        <meshBasicMaterial color={TP3D.cyan} />
      </mesh>
      {/* cheeks */}
      <mesh position={[-0.3, -0.08, 0.5]}>
        <sphereGeometry args={[0.07, 10, 8]} />
        <meshStandardMaterial color={TP3D.pink} roughness={0.9} />
      </mesh>
      <mesh position={[0.3, -0.08, 0.5]}>
        <sphereGeometry args={[0.07, 10, 8]} />
        <meshStandardMaterial color={TP3D.pink} roughness={0.9} />
      </mesh>
      {/* antenna */}
      <mesh position={[0, 0.68, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.22, 6]} />
        <meshStandardMaterial color={TP3D.purple} />
      </mesh>
      <mesh position={[0, 0.82, 0]}>
        <sphereGeometry args={[0.07, 12, 10]} />
        <meshStandardMaterial color={TP3D.cyan} emissive={TP3D.cyan} emissiveIntensity={0.9} />
      </mesh>
      {/* twin jet pack */}
      {[-0.24, 0.24].map((x) => (
        <group key={x} position={[x, -0.05, -0.5]}>
          <mesh>
            <capsuleGeometry args={[0.11, 0.18, 6, 10]} />
            <meshStandardMaterial color={TP3D.purple} roughness={0.4} />
          </mesh>
          <mesh position={[0, -0.24, 0]}>
            <coneGeometry args={[0.07, 0.18, 8]} />
            <meshBasicMaterial color={TP3D.orange} transparent opacity={0.85} />
          </mesh>
        </group>
      ))}
      {/* feet */}
      <mesh position={[-0.2, -0.58, 0.08]}>
        <sphereGeometry args={[0.11, 12, 10]} />
        <meshStandardMaterial color={TP3D.cyanDeep} roughness={0.6} />
      </mesh>
      <mesh position={[0.2, -0.58, 0.08]}>
        <sphereGeometry args={[0.11, 12, 10]} />
        <meshStandardMaterial color={TP3D.cyanDeep} roughness={0.6} />
      </mesh>
    </group>
  );
}

function DriftingCloud({
  position,
  speed,
  scale,
}: {
  position: [number, number, number];
  speed: number;
  scale: number;
}) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const g = ref.current;
    if (!g) return;
    const x = ((clock.elapsedTime * speed + position[0] + 12) % 24) - 12;
    g.position.x = x;
  });
  return (
    <group ref={ref} position={position}>
      <Float speed={1.2} floatIntensity={0.4} floatingRange={[0.05, 0.12]}>
        <Cloud scale={scale} />
      </Float>
    </group>
  );
}

/** Damped pointer parallax on the camera — subtle, never disorienting. */
function CameraParallax() {
  useFrame(({ camera, pointer }, delta) => {
    camera.position.x = THREE.MathUtils.damp(camera.position.x, pointer.x * 0.55, 2.2, delta);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, 1.6 + pointer.y * 0.3, 2.2, delta);
    camera.lookAt(0, 0.6, 0);
  });
  return null;
}

/* ------------------------------------------------------------------ */
/* Scene composition + canvas                                          */
/* ------------------------------------------------------------------ */

function SceneContents({ dark }: { dark: boolean }) {
  return (
    <>
      <ambientLight intensity={dark ? 0.55 : 0.85} />
      <directionalLight position={[6, 9, 5]} intensity={dark ? 1.0 : 1.15} />
      <pointLight position={[-6, 2.5, -3]} intensity={26} distance={22} color={TP3D.purple} />
      <pointLight position={[6, 3, -2]} intensity={22} distance={20} color={TP3D.cyan} />
      <pointLight position={[0, -3, 4]} intensity={12} distance={16} color={TP3D.pink} />

      {/* Mascot + portals form the "two paths" composition */}
      <Twinny position={[0, 0.7, 0.4]} />
      <Portal variant="pump" position={[-3.4, 1.15, -1.2]} scale={0.95} />
      <Portal variant="launchlab" position={[3.4, 1.35, -1.4]} scale={1.02} />

      {/* Islands */}
      <FloatingIsland position={[-5.1, -1.5, -2.4]} scale={0.9} variant={0} />
      <FloatingIsland position={[5.2, -1.1, -2.8]} scale={1.05} variant={1} />
      <FloatingIsland position={[-6.4, 1.9, -5]} scale={0.7} variant={2} />
      <FloatingIsland position={[6.2, 2.4, -5.6]} scale={0.62} variant={0} />

      {/* Coins */}
      <Float speed={2} rotationIntensity={1.4} floatIntensity={1.2} floatingRange={[0.15, 0.35]}>
        <group position={[-1.9, 2.05, 0.6]} rotation={[0.35, 0, 0]}>
          <Coin />
        </group>
      </Float>
      <Float speed={1.7} rotationIntensity={1.2} floatIntensity={1} floatingRange={[0.15, 0.35]}>
        <group position={[2.2, -0.4, 1]} rotation={[0.3, 0.4, 0]}>
          <Coin color={TP3D.cyan} rim={TP3D.cyanDeep} />
        </group>
      </Float>
      <Float speed={2.3} rotationIntensity={1.6} floatIntensity={1.4} floatingRange={[0.15, 0.35]}>
        <group position={[-3.1, -1.05, 1.6]} rotation={[0.5, 0.2, 0]}>
          <Coin color={TP3D.pink} rim={TP3D.purple} />
        </group>
      </Float>
      <Float speed={1.9} rotationIntensity={1.3} floatIntensity={1.1} floatingRange={[0.15, 0.35]}>
        <group position={[3.9, 2.6, 0.2]} rotation={[0.4, 0, 0]}>
          <Coin color={TP3D.orange} rim={TP3D.yellow} />
        </group>
      </Float>

      {/* Decorative geometry */}
      <Float speed={1.5} rotationIntensity={1.8} floatIntensity={0.9}>
        <mesh position={[-4.4, 2.7, -1]} scale={0.34}>
          <icosahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color={TP3D.cyan} roughness={0.3} flatShading />
        </mesh>
      </Float>
      <Float speed={1.3} rotationIntensity={1.6} floatIntensity={0.9}>
        <mesh position={[4.6, -0.9, 0.4]} scale={0.3}>
          <torusKnotGeometry args={[0.7, 0.24, 64, 8]} />
          <meshStandardMaterial color={TP3D.purple} roughness={0.35} />
        </mesh>
      </Float>
      <Float speed={1.6} rotationIntensity={1.5} floatIntensity={0.9}>
        <mesh position={[1.2, 3, -2]} scale={0.26}>
          <octahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color={TP3D.yellow} roughness={0.3} flatShading />
        </mesh>
      </Float>

      {/* Rockets */}
      <Rocket radius={5.6} height={1.9} speed={0.22} offset={0.4} />
      <Rocket radius={6.4} height={-1.4} speed={0.17} offset={2.6} />

      {/* Clouds */}
      <DriftingCloud position={[-8, 2.6, -4]} speed={0.5} scale={1.15} />
      <DriftingCloud position={[4, 3.4, -6]} speed={0.36} scale={1.4} />
      <DriftingCloud position={[-2, -2.6, -3]} speed={0.3} scale={0.95} />
      <DriftingCloud position={[8, -1.8, -4]} speed={0.42} scale={1.05} />

      {/* Stardust */}
      <Sparkles
        count={90}
        scale={[18, 9, 12]}
        size={2.6}
        speed={0.32}
        color={dark ? "#C4B5FD" : TP3D.purple}
        opacity={0.55}
      />
      <Sparkles count={50} scale={[16, 8, 10]} size={2} speed={0.4} color={TP3D.cyan} opacity={0.5} />
    </>
  );
}

export function TwinUniverse({ dark = false, className = "" }: { dark?: boolean; className?: string }) {
  return (
    <div aria-hidden="true" className={`pointer-events-none absolute inset-0 ${className}`}>
      <Canvas
        dpr={[1, 1.75]}
        camera={{ position: [0, 1.6, 9], fov: 42 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        style={{ background: "transparent" }}
      >
        <AdaptiveDpr pixelated />
        <CameraParallax />
        <SceneContents dark={dark} />
      </Canvas>
    </div>
  );
}
