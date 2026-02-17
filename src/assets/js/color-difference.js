(() => {
    const canvas = document.getElementById("canvas");
    const scoreBox = document.getElementById("score");
    const ctx = canvas.getContext("2d");

    let scale = 1;
    let score = 0;
    let level = 1;

    const resizeObs = new ResizeObserver(entries => {
        scale = canvas.width / entries[0].contentRect.width;
    })

    resizeObs.observe(canvas);

    function genClosestColor(diff) {
        const r = Math.floor(Math.random() * 256);
        const g = Math.floor(Math.random() * 256);
        const b = Math.floor(Math.random() * 256);
        const r1 = Math.min(Math.max(0, r + (Math.random() > 0.5 ? 1 : -1) * diff), 255);
        const g1 = Math.min(Math.max(0, g + (Math.random() > 0.5 ? 1 : -1) * diff), 255);
        const b1 = Math.min(Math.max(0, b + (Math.random() > 0.5 ? 1 : -1) * diff), 255);
        return [
            `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`,
            `#${r1.toString(16).padStart(2, '0')}${g1.toString(16).padStart(2, '0')}${b1.toString(16).padStart(2, '0')}`
        ]
    }

    function genColorGrid(n, diff) {
        const list = Array.from({length: n}, () => Array.from({length: n}));
        const answer = Math.floor(Math.random() * n * n);
        const [c1, c2] = genClosestColor(diff);
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                const index = i * n + j;
                list[index] = index === answer ? c2 : c1;
            }
        }
        return [list, answer];
    }

    function getDiff(n) {
        if (n >= 2 && n < 10) {
            return 30 - 2 * n;
        } else {
            return Math.max(1, 20 - n);
        }
    }

    function getN() {
        if (level >= 1 && level <= 54) {
            return Math.ceil((Math.sqrt(8 * level + 9) - 1) / 2);
        } else {
            return 10;
        }
    }

    function draw() {
        if (canvas.width !== canvas.height) {
            throw new Error("shape illegal")
        }
        scoreBox.innerHTML = score;
        const n = getN();
        const diff = getDiff(n);
        const cellWidth = canvas.width / n;
        const [list, answer] = genColorGrid(n, diff);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                const x = cellWidth * j;
                const y = cellWidth * i;
                ctx.beginPath();
                ctx.strokeStyle = '#f6f6f6';
                ctx.fillStyle = list[i * n + j];
                ctx.lineWidth = 4;
                ctx.roundRect(x, y, cellWidth, cellWidth, 10);
                ctx.fill();
                ctx.stroke();
            }
        }
        canvas.onclick = function (e) {
            const cellWidth = canvas.width / n;
            const col = Math.floor(e.offsetX * scale / cellWidth)
            const row = Math.floor(e.offsetY * scale / cellWidth);
            if (row * n + col === answer) {
                level++;
                score += n * (27 - diff);
                draw();
            }
        }
    }

    draw();
})()