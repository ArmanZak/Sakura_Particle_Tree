import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160/build/three.module.js";
import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.160/examples/jsm/controls/OrbitControls.js";

////////////////////
// Scene Setup
////////////////////
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);

// raised camera looking slightly upward
camera.position.set(6, 4, 6);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

////////////////////
// Camera Orbit
////////////////////
const controls = new OrbitControls(camera, renderer.domElement);
controls.enablePan = false;
controls.enableZoom = false;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.4;
controls.target.set(0, 3, 0);
controls.update();

////////////////////
// Soft Light
////////////////////
const light = new THREE.HemisphereLight(0xffffff, 0xffddee, 1.2);
scene.add(light);

////////////////////
// Ground
////////////////////
const ground = new THREE.Mesh(
  new THREE.CircleGeometry(8, 64),
  new THREE.MeshBasicMaterial({ color: 0xffffff })
);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

////////////////////
// Tree Trunk
////////////////////
const trunk = new THREE.Mesh(
  new THREE.CylinderGeometry(0.25, 0.35, 4, 16),
  new THREE.MeshStandardMaterial({ color: 0xcc3366 })
);
trunk.position.y = 2;
scene.add(trunk);

////////////////////
// Particle Leaves
////////////////////
const COUNT = 10000;

const positions = new Float32Array(COUNT * 3);
const offsets = new Float32Array(COUNT);
const radius = 2.5;

for (let i = 0; i < COUNT; i++) {

  // start near ground
  const r = Math.random() * radius;
  const a = Math.random() * Math.PI * 2;

  positions[i * 3] = Math.cos(a) * r;
  positions[i * 3 + 1] = Math.random() * 0.2;
  positions[i * 3 + 2] = Math.sin(a) * r;

  offsets[i] = Math.random() * 10;
}

const geometry = new THREE.BufferGeometry();
geometry.setAttribute(
  "position",
  new THREE.BufferAttribute(positions, 3)
);
geometry.setAttribute(
  "offset",
  new THREE.BufferAttribute(offsets, 1)
);

const material = new THREE.PointsMaterial({
  size: 0.08,
  color: 0xffaacc,
  transparent: true,
  opacity: 0.9
});

material.onBeforeCompile = shader => {

  shader.uniforms.time = { value: 0 };

  shader.vertexShader =
    `
    uniform float time;
    attribute float offset;
    varying float vHeight;
    ` + shader.vertexShader;

  shader.vertexShader = shader.vertexShader.replace(
    "#include <begin_vertex>",
    `
    #include <begin_vertex>

    float t = time + offset;

    // rising motion
    float rise = mod(t * 0.25, 1.0);

    transformed.y += rise * 4.0;

    // bloom outward near top
    float bloom = smoothstep(0.6, 1.0, rise);
    transformed.x *= (1.0 + bloom * 1.5);
    transformed.z *= (1.0 + bloom * 1.5);

    vHeight = rise;
    `
  );

  shader.fragmentShader =
    `
    varying float vHeight;
    ` + shader.fragmentShader;

  shader.fragmentShader = shader.fragmentShader.replace(
    "vec4 diffuseColor = vec4( diffuse, opacity );",
    `
    float d = length(gl_PointCoord - 0.5);
    if(d > 0.5) discard;

    vec3 col = mix(vec3(1.0,0.7,0.8), vec3(1.0,0.8,0.9), vHeight);
    vec4 diffuseColor = vec4(col, 1.0);
    `
  );

  material.userData.shader = shader;
};

const petals = new THREE.Points(geometry, material);
scene.add(petals);

////////////////////
// Animation Loop
////////////////////
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const t = clock.getElapsedTime();
  material.userData.shader.uniforms.time.value = t;

  controls.update();
  renderer.render(scene, camera);
}

animate();

////////////////////
// Resize
////////////////////
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
