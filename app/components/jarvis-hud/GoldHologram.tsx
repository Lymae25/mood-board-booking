'use client'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'

interface Props {
  open: boolean
  reducedMotion: boolean
}

// The three.js wireframe globe behind the gold content panels. Pure
// decoration - all real data lives in the HTML panels rendered on top of
// it by GoldHologramContent (see JarvisHud.tsx), so this component only
// ever needs to know whether it should be visible and animating.
export default function GoldHologram({ open, reducedMotion }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const isMobile = window.innerWidth < 768
    const width = container.clientWidth
    const height = container.clientHeight

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100)
    camera.position.z = 5.4

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2))
    container.appendChild(renderer.domElement)

    const group = new THREE.Group()
    scene.add(group)

    // Wireframe globe: a plain sphere's own segment topology already reads
    // as latitude/longitude lines once wireframed.
    const sphereGeo = new THREE.SphereGeometry(1.6, 28, 18)
    const wireGeo = new THREE.WireframeGeometry(sphereGeo)
    const wireMat = new THREE.LineBasicMaterial({ color: 0xffb300, transparent: true, opacity: 0.55 })
    const wireframe = new THREE.LineSegments(wireGeo, wireMat)
    group.add(wireframe)

    // A second, slightly larger sphere with sparser lines for depth.
    const outerGeo = new THREE.WireframeGeometry(new THREE.SphereGeometry(2.05, 14, 9))
    const outerMat = new THREE.LineBasicMaterial({ color: 0xffd54f, transparent: true, opacity: 0.22 })
    const outer = new THREE.LineSegments(outerGeo, outerMat)
    group.add(outer)

    // Glowing core.
    const coreGeo = new THREE.SphereGeometry(0.22, 16, 16)
    const coreMat = new THREE.MeshBasicMaterial({ color: 0xfff3d6 })
    const core = new THREE.Mesh(coreGeo, coreMat)
    group.add(core)

    // Sparkle particles scattered on/near the sphere surface.
    const particleCount = isMobile ? 90 : 220
    const positions = new Float32Array(particleCount * 3)
    for (let i = 0; i < particleCount; i++) {
      const r = 1.6 + Math.random() * 0.5
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      positions[i * 3 + 2] = r * Math.cos(phi)
    }
    const particleGeo = new THREE.BufferGeometry()
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const particleMat = new THREE.PointsMaterial({ color: 0xffd54f, size: 0.03, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending })
    const particles = new THREE.Points(particleGeo, particleMat)
    group.add(particles)

    let dragging = false
    let lastX = 0, lastY = 0
    let rotY = 0.4, rotX = 0.15
    let materialize = reducedMotion ? 1 : 0

    function onPointerDown(e: PointerEvent) {
      dragging = true
      lastX = e.clientX
      lastY = e.clientY
    }
    function onPointerMove(e: PointerEvent) {
      if (!dragging) return
      const dx = e.clientX - lastX
      const dy = e.clientY - lastY
      rotY += dx * 0.006
      rotX += dy * 0.006
      lastX = e.clientX
      lastY = e.clientY
    }
    function onPointerUp() { dragging = false }

    renderer.domElement.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)

    let raf = 0
    function animate() {
      raf = requestAnimationFrame(animate)

      const targetMaterialize = open ? 1 : 0
      materialize += (targetMaterialize - materialize) * (reducedMotion ? 1 : 0.12)

      if (!reducedMotion && !dragging) rotY += 0.0018

      group.rotation.y = rotY
      group.rotation.x = rotX
      group.scale.setScalar(0.4 + materialize * 0.6)
      wireMat.opacity = 0.55 * materialize
      outerMat.opacity = 0.22 * materialize
      particleMat.opacity = 0.85 * materialize

      if (!reducedMotion) {
        particles.rotation.y -= 0.0009
        const t = Date.now() * 0.001
        core.scale.setScalar(1 + Math.sin(t * 2) * 0.08)
      }

      renderer.render(scene, camera)
    }
    animate()

    function handleResize() {
      if (!container) return
      const w = container.clientWidth
      const h = container.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    const resizeObserver = new ResizeObserver(handleResize)
    resizeObserver.observe(container)

    return () => {
      cancelAnimationFrame(raf)
      resizeObserver.disconnect()
      renderer.domElement.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      sphereGeo.dispose()
      wireGeo.dispose()
      wireMat.dispose()
      outerGeo.dispose()
      outerMat.dispose()
      coreGeo.dispose()
      coreMat.dispose()
      particleGeo.dispose()
      particleMat.dispose()
      renderer.dispose()
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement)
    }
    // Re-creates the whole three.js scene on every open/close toggle (and
    // on a reducedMotion change) - WebGL context churn only then, not on
    // every frame, which is cheap enough here.
  }, [open, reducedMotion])

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute', inset: 0, pointerEvents: open ? 'auto' : 'none',
        opacity: open ? 1 : 0, transition: 'opacity 0.4s ease', cursor: open ? 'grab' : 'default'
      }}
    />
  )
}
