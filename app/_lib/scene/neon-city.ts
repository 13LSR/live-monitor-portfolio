import * as THREE from "three";
import { Reflector } from "three/addons/objects/Reflector.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

export const WORKS_POSITION = new THREE.Vector3(0, 5.6, -32);
export const CITY_LIMIT = 43;

type Block = { x: number; y: number; z: number; w: number; h: number; d: number; color: string };
export type CityObstacle = { x: number; z: number; halfWidth: number; halfDepth: number; height: number };

// The reference is samsyninja-rebuild/docs/pixelcompare/mirror-home.png:
// a dark street, stacked luminous signs, wet reflections and a distant works wall.
// Geometry and sign art here are generated locally, without source-site assets.
export function createNeonCity(scene: THREE.Scene, compact: boolean) {
  const city = new THREE.Group();
  const blocks: Block[] = [];
  const lights: Block[] = [];
  const obstacles: CityObstacle[] = [];
  const signGeometries: THREE.BufferGeometry[] = [];
  const textures: THREE.Texture[] = [];
  const box = (x: number, y: number, z: number, w: number, h: number, d: number, color = "#101321") => {
    blocks.push({ x, y, z, w, h, d, color });
  };
  const light = (x: number, y: number, z: number, w: number, h: number, d: number, color: string) => {
    lights.push({ x, y, z, w, h, d, color });
  };
  let seed = 81;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  const atlasCanvas = document.createElement("canvas");
  atlasCanvas.width = atlasCanvas.height = 2048;
  const ctx = atlasCanvas.getContext("2d")!;
  const titles = ["小茄", "创作中", "OPEN", "EXPERIMENT", "数字花园", "WEB LAB", "HELLO", "探索", "WORKS", "BUILD / PLAY", "01—26", "在线", "IDEAS", "DESIGN", "好奇心", "NEXT"];
  const tones = ["#c9fcff", "#ff376a", "#7aa6ff", "#e6f7ff", "#c598ff", "#c9fcff", "#ff416c", "#f3da73"];
  for (let i = 0; i < 16; i++) {
    const ox = (i % 4) * 512;
    const oy = Math.floor(i / 4) * 512;
    const tone = tones[i % tones.length];
    ctx.save();
    ctx.translate(ox, oy);
    ctx.fillStyle = "#050910";
    ctx.fillRect(0, 0, 512, 512);
    ctx.strokeStyle = tone;
    ctx.fillStyle = tone;
    ctx.lineWidth = 2;
    ctx.strokeRect(18, 18, 476, 476);
    ctx.fillRect(18, 18, 44, 8);
    ctx.fillRect(450, 486, 44, 8);
    ctx.font = "18px monospace";
    ctx.fillText(`XQ / ${String(i + 1).padStart(2, "0")}                    EST. 2026`, 36, 57);
    ctx.font = `800 ${titles[i].length > 7 ? 54 : 82}px Arial, sans-serif`;
    ctx.fillText(titles[i], 34, 197, 444);
    ctx.font = "20px monospace";
    ctx.fillText(i % 2 ? "INDEPENDENT DIGITAL STUDIO" : "SMALL IDEAS. REAL EXPERIENCES.", 36, 238, 435);
    ctx.fillRect(36, 267, 440, 2);
    if (i % 3 === 0) {
      ctx.lineWidth = 2;
      for (let j = 0; j < 5; j++) {
        ctx.beginPath();
        ctx.arc(121, 365, 24 + j * 12, -1.5, 4.1);
        ctx.stroke();
      }
      ctx.font = "18px monospace";
      for (let j = 0; j < 5; j++) ctx.fillText(["INTERACTIVE", "WEB / SPACE", "ALWAYS CURIOUS", "MAKE SOMETHING", "STATUS: ONLINE"][j], 230, 320 + j * 30);
    } else {
      for (let row = 0; row < 7; row++) {
        for (let col = 0; col < 8; col++) {
          ctx.globalAlpha = random() > 0.25 ? 0.72 : 0.18;
          ctx.fillRect(36 + col * 57, 300 + row * 21, 10 + random() * 35, 4);
        }
      }
      ctx.globalAlpha = 1;
    }
    ctx.font = "17px monospace";
    ctx.fillText("↗     CREATE. EXPLORE. REPEAT.", 36, 466);
    ctx.restore();
  }
  const atlas = new THREE.CanvasTexture(atlasCanvas);
  atlas.colorSpace = THREE.SRGBColorSpace;
  atlas.anisotropy = 4;
  textures.push(atlas);
  const sign = (x: number, y: number, z: number, w: number, h: number, tile: number, angle = 0) => {
    const geometry = new THREE.PlaneGeometry(w, h);
    const uv = geometry.getAttribute("uv");
    for (let i = 0; i < uv.count; i++) {
      uv.setXY(i, ((tile % 4) + 0.012 + uv.getX(i) * 0.976) / 4, (3 - Math.floor(tile / 4) + 0.012 + uv.getY(i) * 0.976) / 4);
    }
    geometry.rotateY(angle);
    geometry.translate(x, y, z);
    signGeometries.push(geometry);
    if (angle === 0) {
      box(x, y, z - 0.16, w + 0.25, h + 0.25, 0.25, "#1b2330");
      light(x, y + h / 2 + 0.06, z, w, 0.035, 0.07, tones[tile % 8]);
    }
  };

  // Side streets stay open around the player, with dense silhouettes behind them.
  for (const side of [-1, 1]) {
    for (let row = 0; row < 7; row++) {
      const x = side * (13 + random() * 7);
      const z = 3 - row * 9;
      const w = 4 + random() * 6;
      const d = 6 + random() * 4;
      const h = 9 + random() * 17;
      box(x, h / 2, z, w, h, d);
      box(x, 0.22, z, w + 1.2, 0.44, d + 1);
      box(x, h - 0.8, z, w + 0.4, 0.22, d + 0.4, "#222536");
      obstacles.push({ x, z, halfWidth: w / 2 + 0.5, halfDepth: d / 2 + 0.5, height: h });
      for (let rib = 0; rib < 4; rib++) {
        box(x - w / 2 + rib * w / 3, h / 2, z + d / 2 + 0.07, 0.12, h, 0.16, "#242735");
      }
      for (let floor = 1; floor < h - 1; floor += 1.25) {
        for (let col = 0; col < 5; col++) {
          if (random() < 0.42) continue;
          light(x - w * 0.39 + col * w * 0.195, floor, z + d / 2 + 0.12, 0.27, 0.5, 0.04, random() > 0.3 ? "#72808d" : "#b8d2d6");
        }
      }
      const tile = (row * 3 + (side === 1 ? 5 : 0)) % 16;
      sign(x, h * 0.64, z + d / 2 + 0.22, w * 0.85, Math.min(5, h * 0.27), tile);
      sign(x - side * w * 0.28, h * 0.28, z + d / 2 + 0.3, w * 0.58, 2.4, (tile + 3) % 16);
      sign(x - side * (w / 2 + 0.18), h * 0.55, z, d * 0.75, 4, (tile + 6) % 16, -side * Math.PI / 2);
      // Roof antennas and paired utility conduits.
      box(x + w * 0.3, h + 1.3, z, 0.075, 2.6, 0.075, "#485263");
      light(x + w * 0.3, h + 2.6, z, 0.11, 0.11, 0.11, "#ff234f");
      for (let p = 0; p < 2; p++) box(x + w / 2 - 0.3 - p * 0.3, h * 0.42, z + d / 2 + 0.35, 0.11, h * 0.8, 0.12, "#434852");
    }
    for (let i = 0; i < 10; i++) {
      const x = side * (25 + random() * 17);
      const h = 16 + random() * 25;
      const z = -10 - random() * 65;
      box(x, h / 2, z, 6, h, 7, "#0d1019");
      light(x - 2, h * 0.6, z + 3.6, 0.1, h * 0.65, 0.06, "#365477");
    }
  }

  // Suspended signs, trusses and light strips establish the same street framing.
  box(-7.5, 14, -16, 0.22, 28, 0.22, "#2a303d");
  box(7.5, 14, -16, 0.22, 28, 0.22, "#2a303d");
  box(0, 13.2, -16, 15.4, 0.24, 0.4, "#2a303d");
  sign(-2.6, 10.7, -16, 9, 3.8, 0);
  sign(5.2, 10.7, -16, 3.7, 3.8, 11);
  sign(-9.3, 8.6, -4, 2.1, 8, 7, 0.24);
  sign(9, 6.9, -6, 2.2, 7, 5, -0.22);
  sign(-9.1, 2.8, -2, 5.2, 2, 4, 0.12);
  sign(9.1, 2.4, -8, 4.2, 1.6, 2, -0.12);
  sign(-8.4, 5.2, -15, 3.5, 1.7, 10);
  sign(9.1, 6.2, -20, 5.4, 2.5, 12);
  for (const side of [-1, 1]) {
    box(side * 6.5, 0.04, -13, 0.08, 0.06, 48, "#1d2632");
    for (let z = 9; z > -35; z -= 5) {
      light(side * 6.5, 0.065, z, 0.075, 0.03, 1.1, side === -1 ? "#f62957" : "#73e5f2");
    }
    box(side * 10, 4.8, -10, 0.13, 9.6, 0.13, "#35404c");
    light(side * 10, 9.55, -10, 2.1, 0.05, 0.12, "#c0f6ff");
  }

  const createInstances = (items: Block[], luminous: boolean) => {
    const material = luminous
      ? new THREE.MeshBasicMaterial({ color: new THREE.Color(1.05, 1.05, 1.05) })
      : new THREE.MeshStandardMaterial({ roughness: 0.65, metalness: 0.5 });
    const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(), material, items.length);
    const dummy = new THREE.Object3D();
    items.forEach((item, i) => {
      dummy.position.set(item.x, item.y, item.z);
      dummy.scale.set(item.w, item.h, item.d);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, new THREE.Color(item.color));
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    city.add(mesh);
  };
  createInstances(blocks, false);
  createInstances(lights, true);
  const mergedSigns = mergeGeometries(signGeometries);
  signGeometries.forEach((geometry) => geometry.dispose());
  if (mergedSigns) city.add(new THREE.Mesh(mergedSigns, new THREE.MeshBasicMaterial({ map: atlas, color: new THREE.Color(0.82, 0.82, 0.82), side: THREE.DoubleSide })));

  // The image orbit has a fixed world transform above this open plaza.
  const footing = new THREE.Mesh(new THREE.BoxGeometry(17.5, 0.35, 2), new THREE.MeshStandardMaterial({ color: "#1b2530", metalness: 0.65, roughness: 0.35 }));
  footing.position.set(0, 0.18, -32.2);
  city.add(footing);
  obstacles.push({ x: 0, z: -32.2, halfWidth: 8.4, halfDepth: 0.7, height: 0.35 });
  scene.add(city);

  for (const [x, y, z, color] of [[-9, 6, -3, "#ff154e"], [10, 10.8, -10, "#91c6ff"]] as const) {
    const circle = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.055, 6, 40), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(2.4) }));
    circle.position.set(x, y, z);
    city.add(circle);
  }

  const floor = new Reflector(new THREE.PlaneGeometry(220, 220), {
    textureWidth: compact ? 384 : 768,
    textureHeight: compact ? 384 : 768,
    color: 0x616575,
    clipBias: 0.003,
    multisample: 0,
  });
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.035;
  scene.add(floor);
  // Fine surface grain softens the reflection without another render target.
  const surface = new THREE.Mesh(new THREE.PlaneGeometry(220, 220), new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    vertexShader: `varying vec2 vUv; void main(){vUv=uv*220.;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `varying vec2 vUv; void main(){vec2 q=vUv/3.; vec2 g=abs(fract(q-.5)-.5)/fwidth(q); float line=1.-min(min(g.x,g.y),1.); float grain=fract(sin(dot(floor(vUv*110.),vec2(12.9898,78.233)))*43758.5453); gl_FragColor=vec4(mix(vec3(.012,.017,.027),vec3(.07,.1,.14),line*.55),.23+grain*.12);}`,
  }));
  surface.rotation.x = -Math.PI / 2;
  surface.position.y = -0.02;
  scene.add(surface);

  const ringMaterial = new THREE.ShaderMaterial({
    uniforms: { progress: { value: 0 }, opacity: { value: 0.85 } },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    vertexShader: `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `uniform float progress; uniform float opacity; varying vec2 vUv; void main(){vec2 p=vUv-.5; float r=length(p); float a=(atan(p.x,p.y)+3.14159265)/6.2831853; float ring=smoothstep(.375,.382,r)*(1.-smoothstep(.405,.412,r)); float sweep=step(a,progress); gl_FragColor=vec4(1.,.006,.09,ring*opacity*(.12+.88*sweep));}`,
  });
  const ring = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 4.6), ringMaterial);
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(0, 0.012, 3);
  scene.add(ring);

  return {
    obstacles,
    update(progress: number, revealed: number) {
      ringMaterial.uniforms.progress.value = progress;
      ringMaterial.uniforms.opacity.value = 0.85 * (1 - revealed);
      ring.visible = revealed < 0.99;
    },
    dispose() {
      floor.dispose();
      textures.forEach((texture) => texture.dispose());
    },
  };
}
