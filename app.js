const Engine = Matter.Engine,
    Render = Matter.Render,
    Runner = Matter.Runner,
    Bodies = Matter.Bodies,
    Composite = Matter.Composite,
    Mouse = Matter.Mouse,
    MouseConstraint = Matter.MouseConstraint;

const engine = Engine.create(),
    world = engine.world;

const render = Render.create({
    element: document.getElementById('room'),
    engine: engine,
    options: {
        width: window.innerWidth,
        height: window.innerHeight,
        wireframes: false,
        background: '#f0f0f0'
    }
});

let ground, leftWall, rightWall, ceiling;

function createBoundaries() {
    if (ground) Composite.remove(world, ground);
    if (leftWall) Composite.remove(world, leftWall);
    if (rightWall) Composite.remove(world, rightWall);
    if (ceiling) Composite.remove(world, ceiling);

    ground = Bodies.rectangle(window.innerWidth / 2, window.innerHeight, window.innerWidth, 50, { isStatic: true });
    leftWall = Bodies.rectangle(0, window.innerHeight / 2, 50, window.innerHeight, { isStatic: true });
    rightWall = Bodies.rectangle(window.innerWidth, window.innerHeight / 2, 50, window.innerHeight, { isStatic: true });
    ceiling = Bodies.rectangle(window.innerWidth / 2, 0, window.innerWidth, 50, { isStatic: true });

    Composite.add(world, [ground, leftWall, rightWall, ceiling]);
}

createBoundaries();

// Set up mouse and mouse constraints for dragging
const mouse = Mouse.create(render.canvas);
const mouseConstraint = MouseConstraint.create(engine, {
    mouse: mouse,
    constraint: {
        stiffness: 0.2,
        render: { visible: false }
    }
});
Composite.add(world, mouseConstraint);

// Array to store tasks
const tasks = [];

function createTask(name, description) {
    const radius = 120;

    // Get the position of the "Add task" button
    const addTaskBtn = document.getElementById('addTaskBtn');
    const btnRect = addTaskBtn.getBoundingClientRect();
    
    // Calculate the x and y position for the new task
    const x = btnRect.left + btnRect.width / 2; // Center of the button
    const y = btnRect.top + btnRect.height; // Bottom of the button

    // Create the task body
    const task = Bodies.circle(x, y, radius, {
        restitution: 0.6,
        friction: 0.1,
        frictionAir: 0.01,
        render: {
            fillStyle: getRandomColor(),
            sprite: {
                texture: createTaskTexture(name, radius * 2),
                xScale: 1,
                yScale: 1
            }
        }
    });
    
    task.label = name;
    task.description = description;
    Composite.add(world, task);
    tasks.push(task);
    addToHistory({ type: 'create', task: task });
}

function getRandomColor() {
    const hue = Math.floor(Math.random() * 360);
    return `hsl(${hue}, 70%, 50%)`;
}

function createTaskTexture(text, size) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.fillStyle = getRandomColor();
    ctx.fill();

    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    let fontSize = size / 4;
    do {
        ctx.font = `${fontSize}px Arial`;
        fontSize--;
    } while (ctx.measureText(text).width > size * 0.8);

    ctx.fillText(text, size / 2, size / 2);

    return canvas.toDataURL();
}

document.addEventListener('DOMContentLoaded', () => {
    const addTaskBtn = document.getElementById('addTaskBtn');
    const addTaskConfirm = document.getElementById('addTaskConfirm');
    const taskNameInput = document.getElementById('taskName');
    const taskDescriptionInput = document.getElementById('taskDescription');
    const gravityToggle = document.getElementById('gravityToggle');
    const deleteAllTasksBtn = document.getElementById('deleteAllTasks');
    const resetTasksBtn = document.getElementById('resetTasks');
    const undoBtn = document.getElementById('undoBtn');
    const redoBtn = document.getElementById('redoBtn');

    addTaskBtn.addEventListener('click', () => {
        showInputTray();
    });

    addTaskConfirm.addEventListener('click', () => {
        const name = taskNameInput.value.trim();
        const description = taskDescriptionInput.value.trim();
        if (name) {
            createTask(name, description);
            hideInputTray();
        }
    });

    gravityToggle.addEventListener('change', (e) => {
        world.gravity.y = e.target.checked ? 1 : 0;
    });

    deleteAllTasksBtn.addEventListener('click', deleteAllTasks);
    resetTasksBtn.addEventListener('click', resetTasks);
    undoBtn.addEventListener('click', undo);
    redoBtn.addEventListener('click', redo);

    document.addEventListener('keydown', (e) => {
        switch (e.key.toLowerCase()) {
            case 'q':
                e.preventDefault();
                showInputTray();
                break;
            case 'escape':
                hideInputTray();
                break;
            case 'enter':
                if (document.activeElement === taskNameInput) {
                    addTaskConfirm.click();
                }
                break;
            case 'z':
                if (e.ctrlKey && e.shiftKey) {
                    redo();
                } else if (e.ctrlKey) {
                    undo();
                }
                break;
        }
    });
});

function showInputTray() {
    const tray = document.getElementById('inputTray');
    tray.style.display = 'block';
    tray.style.top = '40px';
    tray.style.left = '50%';
    tray.style.transform = 'translateX(-50%)';
    document.getElementById('taskName').focus();
}

function hideInputTray() {
    const tray = document.getElementById('inputTray');
    tray.style.display = 'none';
    document.getElementById('taskName').value = '';
    document.getElementById('taskDescription').value = '';
}

function deleteAllTasks() {
    addToHistory({ type: 'deleteAll', tasks: [...tasks] });
    tasks.forEach(task => {
        Composite.remove(world, task);
    });
    tasks.length = 0;
}

function resetTasks() {
    const taskSize = 240;
    const margin = 20;
    const columns = Math.floor(window.innerWidth / (taskSize + margin));
    
    addToHistory({ type: 'reset', positions: tasks.map(task => ({ id: task.id, position: { ...task.position } })) });
    
    tasks.forEach((task, index) => {
        const row = Math.floor(index / columns);
        const col = index % columns;
        const x = (taskSize / 2) + margin + col * (taskSize + margin);
        const y = window.innerHeight - ((taskSize / 2) + margin + row * (taskSize + margin));
        
        Matter.Body.setPosition(task, { x, y });
    });
}

const taskHistory = [];
let historyIndex = -1;

function addToHistory(action) {
    historyIndex++;
    taskHistory.splice(historyIndex);
    taskHistory.push(action);
}

function undo() {
    if (historyIndex >= 0) {
        const action = taskHistory[historyIndex];
        historyIndex--;

        switch(action.type) {
            case 'create':
                Composite.remove(world, action.task);
                tasks.splice(tasks.indexOf(action.task), 1);
                break;
            case 'deleteAll':
                action.tasks.forEach(task => {
                    Composite.add(world, task);
                    tasks.push(task);
                });
                break;
            case 'reset':
                action.positions.forEach(({ id, position }) => {
                    const task = tasks.find(t => t.id === id);
                    if (task) {
                        Matter.Body.setPosition(task, position);
                    }
                });
                break;
        }
    }
}

function redo() {
    if (historyIndex < taskHistory.length - 1) {
        historyIndex++;
        const action = taskHistory[historyIndex];

        switch(action.type) {
            case 'create':
                Composite.add(world, action.task);
                tasks.push(action.task);
                break;
            case 'deleteAll':
                tasks.forEach(task => {
                    Composite.remove(world, task);
                });
                tasks.length = 0;
                break;
            case 'reset':
                resetTasks();
                break;
        }
    }
}

Runner.run(engine);
Render.run(render);

window.addEventListener('resize', () => {
    render.canvas.width = window.innerWidth;
    render.canvas.height = window.innerHeight;
    createBoundaries();
});