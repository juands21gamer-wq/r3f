// HeroHeader.jsx
// Header interactivo de portafolio con React Three Fiber + drei + modelo FBX animado (Mixamo)
//
// Dependencias:
//   npm install three @react-three/fiber @react-three/drei
//   (Tailwind CSS es opcional: abajo hay clases de Tailwind; si no lo usas, cámbialas por CSS propio)
//
// Archivo del modelo:
//   Descarga un personaje + animación desde Mixamo (Format: FBX Binary, With Skin)
//   y guárdalo en:  public/models/avatar.fbx
//   Si el FBX no trae animación, descarga la animación (p.ej. "Waving" o "Idle")
//   con la opción "With Skin" y úsala directamente como avatar.

import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useLoader } from '@react-three/fiber'
import {
    OrbitControls,
    useAnimations,
    Environment,
    ContactShadows,
    Float,
    Html,
    useProgress,
} from '@react-three/drei'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader'
import * as THREE from 'three'

const MODEL_URL = '/models/avatar.fbx'

/* ------------------------------------------------------------------ */
/* 1. Modelo FBX animado                                               */
/* ------------------------------------------------------------------ */
function AnimatedAvatar({ active, onToggle }) {
    const group = useRef()
    const fbx = useLoader(FBXLoader, MODEL_URL)

    // useAnimations recibe los clips del FBX y un ref al objeto que se anima
    const { actions, names } = useAnimations(fbx.animations, group)

    // Sombras y materiales: se recorre el árbol del FBX una sola vez
    useEffect(() => {
        fbx.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true
                child.receiveShadow = true
                if (child.material) child.material.envMapIntensity = 0.8
            }
        })
    }, [fbx])

    // Reproducir la primera animación del archivo (idle / saludo)
    useEffect(() => {
        const action = actions[names[0]]
        if (!action) return
        action.reset().fadeIn(0.5).play()
        return () => action.fadeOut(0.5)
    }, [actions, names])

    // Al activar (click), la animación se acelera
    useEffect(() => {
        const action = actions[names[0]]
        if (action) action.timeScale = active ? 1.8 : 1
    }, [active, actions, names])

    // Suaviza el cambio de escala con useFrame (lerp)
    useFrame((_, delta) => {
        if (!group.current) return
        const target = active ? 0.0125 : 0.01
        const s = THREE.MathUtils.lerp(group.current.scale.x, target, delta * 6)
        group.current.scale.setScalar(s)
    })

    return (
        <group
            ref={group}
            scale={0.01}
            position={[0, -1.4, 0]}
            onClick={(e) => {
                e.stopPropagation()
                onToggle()
            }}
            onPointerOver={() => (document.body.style.cursor = 'pointer')}
            onPointerOut={() => (document.body.style.cursor = 'auto')}
        >
            <primitive object={fbx} />
        </group>
    )
}

/* ------------------------------------------------------------------ */
/* 2. Formas flotantes que reaccionan con useFrame                     */
/* ------------------------------------------------------------------ */
function FloatingShape({ position, geometry = 'box', color, speed = 1, active }) {
    const mesh = useRef()
    const [hovered, setHovered] = useState(false)

    useFrame((state, delta) => {
        if (!mesh.current) return
        // Rotación continua
        mesh.current.rotation.x += delta * 0.4 * speed
        mesh.current.rotation.y += delta * 0.6 * speed
        // Escala reactiva al hover y al estado global "active"
        const target = (hovered ? 1.4 : 1) * (active ? 1.2 : 1)
        mesh.current.scale.lerp(new THREE.Vector3(target, target, target), delta * 8)
    })

    return (
        <Float speed={1.5 * speed} rotationIntensity={0.4} floatIntensity={1.2}>
            <mesh
                ref={mesh}
                position={position}
                castShadow
                onPointerOver={(e) => {
                    e.stopPropagation()
                    setHovered(true)
                }}
                onPointerOut={() => setHovered(false)}
            >
                {geometry === 'box' && <boxGeometry args={[0.4, 0.4, 0.4]} />}
                {geometry === 'octa' && <octahedronGeometry args={[0.3]} />}
                {geometry === 'torus' && <torusGeometry args={[0.25, 0.08, 16, 40]} />}
                <meshStandardMaterial
                    color={hovered ? '#ffffff' : color}
                    emissive={color}
                    emissiveIntensity={hovered ? 0.8 : 0.25}
                    roughness={0.3}
                    metalness={0.6}
                />
            </mesh>
        </Float>
    )
}

/* Nube de partículas que gira lentamente */
function Particles({ count = 250, active }) {
    const points = useRef()
    const positions = useMemo(() => {
        const arr = new Float32Array(count * 3)
        for (let i = 0; i < count; i++) {
            arr[i * 3] = (Math.random() - 0.5) * 12
            arr[i * 3 + 1] = (Math.random() - 0.5) * 7
            arr[i * 3 + 2] = (Math.random() - 0.5) * 8 - 2
        }
        return arr
    }, [count])

    useFrame((state, delta) => {
        if (!points.current) return
        points.current.rotation.y += delta * (active ? 0.18 : 0.05)
        points.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.1) * 0.05
    })

    return (
        <points ref={points}>
            <bufferGeometry>
                <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
            </bufferGeometry>
            <pointsMaterial size={0.04} color={active ? '#f5b942' : '#8fd3ff'} sizeAttenuation transparent opacity={0.8} />
        </points>
    )
}

/* ------------------------------------------------------------------ */
/* 3. Escena completa                                                  */
/* ------------------------------------------------------------------ */
function Scene({ active, onToggle }) {
    return (
        <>
            {/* Iluminación */}
            <ambientLight intensity={0.5} />
            <directionalLight
                position={[4, 6, 5]}
                intensity={2.2}
                castShadow
                shadow-mapSize={[1024, 1024]}
            />
            <pointLight position={[-4, 2, -2]} intensity={40} color="#6ea8ff" />
            <pointLight position={[3, -1, 3]} intensity={25} color={active ? '#f5b942' : '#ff7ad9'} />
            <Environment preset="city" />

            <AnimatedAvatar active={active} onToggle={onToggle} />

            <FloatingShape position={[-2.6, 1.2, -0.5]} geometry="box" color="#6ea8ff" speed={1} active={active} />
            <FloatingShape position={[2.8, 0.6, -1]} geometry="octa" color="#ff7ad9" speed={1.3} active={active} />
            <FloatingShape position={[2.2, -0.9, 0.8]} geometry="torus" color="#f5b942" speed={0.8} active={active} />
            <FloatingShape position={[-2.4, -0.6, 0.6]} geometry="octa" color="#7dffb2" speed={1.1} active={active} />

            <Particles active={active} />

            <ContactShadows position={[0, -1.4, 0]} opacity={0.5} scale={8} blur={2.5} far={3} />

            {/* Órbita restringida: sin zoom, sin pan, ángulos limitados */}
            <OrbitControls
                enableZoom={false}
                enablePan={false}
                minPolarAngle={Math.PI / 2.6}
                maxPolarAngle={Math.PI / 1.9}
                minAzimuthAngle={-Math.PI / 5}
                maxAzimuthAngle={Math.PI / 5}
                rotateSpeed={0.5}
            />
        </>
    )
}

function Loader() {
    const { progress } = useProgress()
    return (
        <Html center>
            <span className="text-sm text-white/80">Cargando modelo… {progress.toFixed(0)}%</span>
        </Html>
    )
}

/* ------------------------------------------------------------------ */
/* 4. Header: Canvas + UI superpuesta (HTML + Tailwind)                */
/* ------------------------------------------------------------------ */
export default function HeroHeader() {
    const [active, setActive] = useState(false)

    return (
        <header className="relative h-screen w-full overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950">
            {/* Capa 3D */}
            <Canvas
                shadows
                camera={{ position: [0, 0.4, 5], fov: 45 }}
                dpr={[1, 2]}
                className="!absolute inset-0"
            >
                <Suspense fallback={<Loader />}>
                    <Scene active={active} onToggle={() => setActive((a) => !a)} />
                </Suspense>
            </Canvas>

            {/* Capa UI: pointer-events-none para no bloquear el canvas; los botones lo reactivan */}
            <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-6 md:p-12">
                <nav className="pointer-events-auto flex items-center justify-between text-white">
                    <span className="text-lg font-semibold tracking-tight">juan david solano</span>
                    <ul className="hidden gap-8 text-sm text-white/80 md:flex">
                        <li><a className="hover:text-white" href="#proyectos">Proyectos</a></li>
                        <li><a className="hover:text-white" href="#sobre-mi">Sobre mí</a></li>
                        <li><a className="hover:text-white" href="#contacto">Contacto</a></li>
                    </ul>
                </nav>

                <div className="max-w-xl text-white">
                    <h1 className="text-4xl font-bold leading-tight md:text-6xl">
                        Hola, soy Tu Nombre
                    </h1>
                    <p className="mt-4 text-lg text-white/80 md:text-xl">
                        Ingeniero en formación · Desarrollo web e interfaces 3D
                    </p>
                    <p className="mt-2 text-sm text-white/60">
                        {active
                            ? 'Modo activo: haz clic de nuevo en el avatar para volver.'
                            : 'Haz clic en el avatar o pasa el cursor sobre las formas.'}
                    </p>

                    <div className="pointer-events-auto mt-8 flex flex-wrap gap-4">
                        <a
                            href="#proyectos"
                            className="rounded-full bg-white px-6 py-3 font-medium text-slate-900 transition hover:bg-amber-300"
                        >
                            Ver proyectos
                        </a>
                        <a
                            href="https://github.com/juands21gamer-wq"
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-full border border-white/40 px-6 py-3 font-medium text-white transition hover:bg-white/10"
                        >
                            GitHub
                        </a>
                        <a
                            href="https://linkedin.com/in/tu-usuario"
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-full border border-white/40 px-6 py-3 font-medium text-white transition hover:bg-white/10"
                        >
                            LinkedIn
                        </a>
                    </div>
                </div>
            </div>
        </header>
    )
}