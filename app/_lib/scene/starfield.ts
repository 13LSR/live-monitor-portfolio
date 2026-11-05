import * as THREE from "three";

// Two depth ranges share one draw call. All positions are world coordinates;
// only the nearby motes drift, so turning the camera reveals a stable sky.
export function createStarfield(scene: THREE.Scene, compact: boolean, reducedMotion: boolean) {
  const sky = new THREE.Group();
  sky.name = "night-sky";
  const distantCount = compact ? 700 : 1600;
  const moteCount = compact ? 70 : 180;
  const count = distantCount + moteCount;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const phases = new Float32Array(count);
  const drifts = new Float32Array(count);
  const palette = ["#9ebfe0", "#c5b4e2", "#c9dce6", "#94cfd4"].map((color) => new THREE.Color(color));
  let seed = 4317;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < count; i++) {
    const nearby = i >= distantCount;
    const azimuth = nearby ? (random() - 0.5) * 3.1 : random() * Math.PI * 2;
    const radius = nearby ? 55 + random() * 33 : 115 + random() * 70;
    const elevation = nearby ? 0.06 + random() * 0.42 : 0.025 + Math.pow(random(), 1.7) * 0.9;
    const horizontal = radius * Math.sqrt(1 - elevation * elevation);
    positions.set([Math.sin(azimuth) * horizontal, elevation * radius, Math.cos(azimuth) * horizontal], i * 3);
    palette[Math.floor(random() * palette.length)].toArray(colors, i * 3);
    sizes[i] = nearby ? 0.12 + random() * 0.2 : 0.15 + Math.pow(random(), 3) * 0.65;
    phases[i] = random() * Math.PI * 2;
    drifts[i] = nearby ? 0.25 + random() * 0.5 : 0;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));
  geometry.setAttribute("aDrift", new THREE.BufferAttribute(drifts, 1));
  geometry.computeBoundingSphere();
  geometry.boundingSphere!.radius += 1.5;
  const material = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uReveal: { value: 0 }, uPointScale: { value: 1 } },
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    fog: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `
      uniform float uTime;
      uniform float uPointScale;
      attribute float aSize;
      attribute float aPhase;
      attribute float aDrift;
      varying vec3 vColor;
      varying float vBrightness;
      void main() {
        vec3 point = position;
        point.x += sin(uTime * .16 + aPhase) * aDrift;
        point.y += sin(uTime * .22 + aPhase * 1.7) * aDrift;
        vec4 view = modelViewMatrix * vec4(point, 1.);
        gl_Position = projectionMatrix * view;
        gl_PointSize = clamp(aSize * uPointScale * projectionMatrix[1][1] / max(-view.z, 1.), .8, 5.);
        vColor = color;
        vBrightness = .64 + .18 * sin(uTime * (.35 + aDrift * .25) + aPhase);
      }
    `,
    fragmentShader: `
      uniform float uReveal;
      varying vec3 vColor;
      varying float vBrightness;
      void main() {
        float radius = length(gl_PointCoord - .5) * 2.;
        float glow = exp(-radius * radius * 5.) * (1. - smoothstep(.65, 1., radius));
        float alpha = glow * vBrightness * uReveal;
        if (alpha < .015) discard;
        gl_FragColor = vec4(vColor, alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  const stars = new THREE.Points(geometry, material);
  stars.name = "sky-stars";
  const viewport = new THREE.Vector4();
  stars.onBeforeRender = (renderer) => {
    // Reflections render at a different resolution from the main camera.
    renderer.getCurrentViewport(viewport);
    material.uniforms.uPointScale.value = viewport.w / 2;
  };
  sky.add(stars);

  // A quiet blue/violet band gives the open rear sky a backdrop. It is
  // procedural and static, with no downloaded texture or fullscreen effect.
  const domeGeometry = new THREE.SphereGeometry(220, 32, 16);
  const domeMaterial = new THREE.ShaderMaterial({
    uniforms: { uReveal: { value: 0 } },
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    vertexShader: `
      varying vec3 vDirection;
      void main() {
        vDirection = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
      }
    `,
    fragmentShader: `
      uniform float uReveal;
      varying vec3 vDirection;
      void main() {
        vec3 direction = normalize(vDirection);
        float rear = smoothstep(-.45, .65, direction.z);
        float horizon = smoothstep(-.02, .16, direction.y);
        float ridge = direction.y - .22 - .13 * sin(direction.x * 3. + direction.z);
        float band = exp(-ridge * ridge * 45.);
        float wisps = .58 + .24 * sin(direction.x * 14. + direction.z * 5.)
          + .18 * sin(direction.x * 27. - direction.y * 18.);
        vec3 tint = mix(vec3(.004, .018, .034), vec3(.024, .007, .032), smoothstep(-.5, .7, direction.x));
        vec3 base = vec3(.00152, .00182, .00368);
        gl_FragColor = vec4(base + tint * band * wisps * rear * horizon * uReveal, 1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  const dome = new THREE.Mesh(domeGeometry, domeMaterial);
  dome.name = "sky-backdrop";
  dome.renderOrder = -2;
  sky.add(dome);
  scene.add(sky);
  let disposed = false;

  return {
    update(dt: number, reveal: number) {
      if (disposed) return;
      if (!reducedMotion) material.uniforms.uTime.value += Math.max(0, Math.min(dt, 0.04));
      material.uniforms.uReveal.value = THREE.MathUtils.clamp(reveal, 0, 1);
      domeMaterial.uniforms.uReveal.value = material.uniforms.uReveal.value;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      scene.remove(sky);
      geometry.dispose();
      material.dispose();
      domeGeometry.dispose();
      domeMaterial.dispose();
    },
  };
}
