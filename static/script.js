
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

// 화면 요소
const container = document.getElementById("scene-container");
const diskCountInput = document.getElementById("diskCount");
const startButton = document.getElementById("startButton");
const pauseButton = document.getElementById("pauseButton");
const resetButton = document.getElementById("resetButton");
const speedInput = document.getElementById("speed");
const speedLabel = document.getElementById("speedLabel");
const statusText = document.getElementById("status");
const progressBar = document.getElementById("progressBar");
const loading = document.getElementById("loading");

// Three.js 장면
const scene = new THREE.Scene();
scene.background = new THREE.Color("#111722");

const camera = new THREE.PerspectiveCamera(
    45,
    1,
    0.1,
    200
);

camera.position.set(7, 7, 10);

const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false
});

renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

container.appendChild(renderer.domElement);

// 마우스 카메라 조작
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.enablePan = true;
controls.minDistance = 4;
controls.maxDistance = 22;
controls.minPolarAngle = 0.12;
controls.maxPolarAngle = Math.PI * 0.49;

// 조명
scene.add(new THREE.HemisphereLight(0xc8ddff, 0x332719, 2));

const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
scene.add(ambientLight);

const mainLight = new THREE.DirectionalLight(0xffe5c4, 3.2);
mainLight.position.set(-4, 10, 6);
mainLight.castShadow = true;
mainLight.shadow.mapSize.set(2048, 2048);
mainLight.shadow.camera.left = -10;
mainLight.shadow.camera.right = 10;
mainLight.shadow.camera.top = 12;
mainLight.shadow.camera.bottom = -10;
mainLight.shadow.bias = 0.00001;
scene.add(mainLight);

const fillLight = new THREE.DirectionalLight(0x8eafff, 1.3);
fillLight.position.set(5, 5, -5);
scene.add(fillLight);


// 하노이의 탑 객체
const boardGroup = new THREE.Group();
scene.add(boardGroup);

const pegX = {
    A: -3.4,
    B: 0,
    C: 3.4
};

let disks = { A: [], B: [], C: [] };
let moves = [];
let moveIndex = 0;

let isRunning = false;
let isPaused = false;
let generation = 0;
let activeMove = null;

let diskHeight = 0.24;
let baseTop = 0.15;
let pegHeight = 2.0;

// 원판 이동 순서 계산
function solveHanoi(n, from, auxiliary, to) {
    if (n === 1) {
        moves.push({ from, to });
        return;
    }

    solveHanoi(n - 1, from, to, auxiliary);
    moves.push({ from, to });
    solveHanoi(n - 1, auxiliary, from, to);
}

// 이전 3D 객체 정리
function clearBoard() {
    while (boardGroup.children.length > 0) {
        const object = boardGroup.children[0];
        boardGroup.remove(object);

        object.traverse(child => {
            if (child.geometry) {
                child.geometry.dispose();
            }

            if (child.material) {
                const materials = Array.isArray(child.material)
                    ? child.material
                    : [child.material];

                materials.forEach(material => material.dispose());
            }
        });
    }
}

// 받침대와 기둥 생성
function createTower(x, count) {
    const baseMaterial = new THREE.MeshStandardMaterial({
        color: 0x8a6646,
        roughness: 0.42,
        metalness: 0.18
    });

    const rodMaterial = new THREE.MeshStandardMaterial({
        color: 0xc4cbd6,
        roughness: 0.24,
        metalness: 0.8
    });

    // 받침대
    const base = new THREE.Mesh(
        new THREE.CylinderGeometry(1.45, 1.55, 0.3, 64),
        baseMaterial
    );

    base.position.set(x, 0, 0);
    base.castShadow = true;
    base.receiveShadow = true;
    boardGroup.add(base);

    // 수직 기둥
    const rod = new THREE.Mesh(
        new THREE.CylinderGeometry(0.085, 0.11, pegHeight, 32),
        rodMaterial
    );

    rod.position.set(x, baseTop + pegHeight / 2, 0);
    rod.castShadow = true;
    rod.receiveShadow = true;
    boardGroup.add(rod);

    // 기둥 꼭대기 장식
    const cap = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 24, 16),
        rodMaterial
    );

    cap.position.set(x, baseTop + pegHeight, 0);
    cap.castShadow = true;
    boardGroup.add(cap);
}

// 원판과 기둥을 새로 생성
function createBoard() {
    clearBoard();

    const count = Number(diskCountInput.value);

    diskHeight = Math.min(0.24, 3.6 / count);
    baseTop = 0.15;
    pegHeight = count * diskHeight + 1.1;

    disks = { A: [], B: [], C: [] };

    ["A", "B", "C"].forEach(name => {
        createTower(pegX[name], count);
    });

    const minRadius = 0.42;
    const maxRadius = 1.25;

    for (let size = count; size >= 1; size--) {
        const ratio = count === 1
            ? 1
            : (size - 1) / (count - 1);

        const radius = minRadius + (maxRadius - minRadius) * ratio;

        const hue = 0.58 - ratio * 0.43;

        const material = new THREE.MeshStandardMaterial({
            color: new THREE.Color().setHSL(hue, 0.72, 0.48),
            roughness: 0.28,
            metalness: 0.22
        });

        const geometry = new THREE.CylinderGeometry(
            radius,
            radius,
            diskHeight * 0.92,
            64
        );

        const disk = new THREE.Mesh(geometry, material);

        disk.castShadow = true;
        disk.receiveShadow = true;
        disk.userData.size = size;

        disk.position.set(
            pegX.A,
            baseTop + diskHeight * (disks.A.length + 0.5),
            0
        );

        boardGroup.add(disk);
        disks.A.push(disk);
    }

    // 카메라를 새 장면 중앙으로 맞춤
    controls.target.set(0, pegHeight * 0.4, 0);

    camera.position.set(
        7,
        pegHeight * 0.9 + 3,
        10
    );

    controls.update();

    updateProgress();
}

// 진행률 표시
function updateProgress() {
    const percentage = moves.length === 0
        ? 0
        : (moveIndex / moves.length) * 100;

    progressBar.style.width = `${percentage}%`;
}

// 버튼 상태 갱신
function updateButtons() {
    startButton.disabled = isRunning;
    pauseButton.disabled = !isRunning;
    pauseButton.textContent = isPaused ? "재개" : "일시정지";
    diskCountInput.disabled = isRunning;
}

// 진행 중인 이동 취소
function cancelActiveMove() {
    if (activeMove) {
        const current = activeMove;
        activeMove = null;
        current.resolve(false);
    }
}

// 원판 한 개를 3D 공간에서 이동
function animateMove(from, to, token) {
    return new Promise(resolve => {
        if (token !== generation) {
            resolve(false);
            return;
        }

        const disk = disks[from][disks[from].length - 1];

        if (!disk) {
            resolve(false);
            return;
        }

        const start = disk.position.clone();

        const target = new THREE.Vector3(
            pegX[to],
            baseTop + diskHeight * (disks[to].length + 0.5),
            0
        );

        activeMove = {
            disk,
            from,
            to,
            start,
            target,
            elapsed: 0,
            duration: Math.max(0.08, 0.18 + Number(speedInput.value) * 0.3),
            lift: Math.max(0.8, pegHeight * 0.3),
            token,
            resolve
        };
    });
}

// 알고리즘 실행
async function runHanoi(token) {
    while (moveIndex < moves.length) {
        while (isPaused && token === generation) {
            await sleep(60);
        }

        if (token !== generation) return;

        const move = moves[moveIndex];
        const success = await animateMove(move.from, move.to, token);

        if (!success || token !== generation) return;

        moveIndex++;
        updateProgress();

        statusText.textContent =
            `이동 ${moveIndex} / ${moves.length} · ${move.from} → ${move.to}`;

        if (moveIndex < moves.length) {
            await sleep(Number(speedInput.value) * 1000);
        }
    }

    if (token !== generation) return;

    isRunning = false;
    isPaused = false;

    updateButtons();

    statusText.textContent =
        `완료! 총 ${moves.length.toLocaleString()}번 이동했습니다.`;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// 실행
startButton.addEventListener("click", () => {
    if (isRunning) return;

    const count = Number(diskCountInput.value);

    if (!Number.isInteger(count) || count < 1 || count > 15) {
        alert("원판은 1개부터 15개까지 입력할 수 있습니다.");
        diskCountInput.value = 3;
        return;
    }

    generation++;

    moves = [];
    moveIndex = 0;
    isRunning = true;
    isPaused = false;

    solveHanoi(count, "A", "B", "C");
    createBoard();

    statusText.textContent =
        `실행 중... 최소 이동 횟수: ${moves.length.toLocaleString()}회`;

    updateButtons();
    runHanoi(generation);
});

// 일시정지 및 재개
pauseButton.addEventListener("click", () => {
    if (!isRunning) return;

    isPaused = !isPaused;

    statusText.textContent = isPaused
        ? "일시정지 중"
        : `실행 중... 이동 ${moveIndex} / ${moves.length}`;

    updateButtons();
});

// 초기화
resetButton.addEventListener("click", () => {
    generation++;
    cancelActiveMove();

    isRunning = false;
    isPaused = false;
    moves = [];
    moveIndex = 0;

    updateButtons();
    createBoard();

    statusText.textContent = "초기화 완료. 다시 실행할 수 있습니다.";
});

// 속도 조절
speedInput.addEventListener("input", () => {
    const speed = Number(speedInput.value);

    speedLabel.textContent = speed === 0
        ? "최고 속도"
        : `${speed.toFixed(2)}초`;
});

// 화면 크기 변경 대응
function resizeRenderer() {
    const width = container.clientWidth;
    const height = container.clientHeight;

    if (!width || !height) return;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.setSize(width, height, false);
}

window.addEventListener("resize", resizeRenderer);

// 실시간 렌더링
let previousTime = 0;

function render(time) {
    requestAnimationFrame(render);

    const delta = previousTime === 0
        ? 0
        : Math.min((time - previousTime) / 1000, 0.05);

    previousTime = time;

    if (activeMove && !isPaused) {
        const move = activeMove;

        move.elapsed += delta;

        const t = Math.min(move.elapsed / move.duration, 1);
        const smooth = t * t * (3 - 2 * t);

        move.disk.position.lerpVectors(
            move.start,
            move.target,
            smooth
        );

        // 원판을 들어 올렸다가 목적 기둥에 내려놓는 궤적
        move.disk.position.y +=
            Math.sin(Math.PI * t) * move.lift;

        if (t >= 1) {
            move.disk.position.copy(move.target);

            disks[move.from].pop();
            disks[move.to].push(move.disk);

            activeMove = null;
            move.resolve(true);
        }
    }

    controls.update();
    renderer.render(scene, camera);
}

// 초기 화면 구성
createBoard();
resizeRenderer();

speedLabel.textContent =
    `${Number(speedInput.value).toFixed(2)}초`;

updateButtons();

loading.remove();

requestAnimationFrame(render);
