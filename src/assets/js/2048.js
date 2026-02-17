(() => {
    const fontSize = [0, 45, 40, 30, 30];
    const touches = {};
    const bgColor = {
        default: '#cdc0b2',
        2: '#eee3d9',
        4: '#ebdcbd',
        8: '#f2b279',
        16: '#f7925c',
        32: '#f57756',
        64: '#f5522e',
        128: '#eecf71',
        256: '#e6d153',
        512: '#cea30c',
        1024: '#d88e00',
        2048: '#c77800'
    };
    const n = 4
    const config = JSON.parse(localStorage.getItem('2048-config'));
    const resetBtn = document.getElementById("resetBtn");
    const cellBox = document.querySelector(".cell-box")
    const unDeal = document.querySelector(".unDeal")
    const sc = document.querySelector(".sc")
    // 下右两个方向
    const direction = [[1, 0], [0, 1]]
    // 未合并的数字方格数量
    let unDealCount = 0
    // 分数
    let score = 0
    // 数字
    let arr = [];
    // Dom
    let cells = [];
    // cell宽
    let cellWidth = 0;
    const resizeObs = new ResizeObserver(entries => {
        entries.forEach(item => {
            if (item.target === cellBox) {
                cellWidth = item.contentRect.width / n;
            }
        })
    })
    resizeObs.observe(cellBox);

    drawGrid();
    startNew(config);
    localStorage.removeItem('2048-config');

    // 手势控制
    cellBox.addEventListener("touchstart", (e) => {
        for (let t of e.changedTouches) {
            touches[t.identifier] = {
                x: t.screenX,
                y: t.screenY
            };
        }
    });
    cellBox.addEventListener("touchmove", (e) => {
        e.preventDefault();
    })
    cellBox.addEventListener("touchend", (e) => {
        let isMoving = false;
        for (let t of e.changedTouches) {
            if (!isMoving) {
                isMoving = true;
                const touch = touches[t.identifier];
                const offsetX = t.screenX - touch.x;
                const offsetY = t.screenY - touch.y;
                if (Math.abs(offsetX) >= Math.abs(offsetY)) {
                    runMerge(offsetX > 0 ? 'ArrowRight' : 'ArrowLeft');
                } else {
                    runMerge(offsetY > 0 ? 'ArrowDown' : 'ArrowUp');
                }
            }
            delete touches[t.identifier];
        }
    });
    // 方向控制
    document.addEventListener("keyup", (e) => {
        runMerge(e.key);
    })
    // 状态持久化
    window.addEventListener("beforeunload", () => {
        localStorage.setItem('2048-config', JSON.stringify({
            unDealCount,
            score,
            arr
        }));
    })
    // 重新开始
    resetBtn.addEventListener("click", startNew);

    /**
     * 画方格
     */
    function drawGrid() {
        cells = Array.from({length: n * n}, () => {
            const cell = document.createElement("div");
            cell.className = "cell";
            return cell;
        });

        cellBox.style.cssText = `grid-template-columns: repeat(${n}, minmax(0, 1fr)); grid-template-rows: repeat(${n}, minmax(0, 1fr));`
        const fragment = document.createDocumentFragment();
        for (let i = 0; i < n * n; i++) {
            const cellWp = document.createElement("div");
            cellWp.className = 'cell-wrapper';
            cellWp.appendChild(cells[i]);
            fragment.appendChild(cellWp);
        }
        cellBox.innerHTML = '';
        cellBox.appendChild(fragment);
    }

    function draw() {
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                const value = arr[i][j];
                const elem = cells[i * n + j];
                elem.innerHTML = value || "";
                elem.style.cssText = value ? `font-size: ${fontSize[numLen(value)]}px; background-color: ${bgColor[value] || '#cdc0b2'};color: ${value >= 8 ? '#fff' : '#7a6c65'}` : '';
            }
        }
        unDeal.innerHTML = unDealCount
        sc.innerHTML = score
    }

    function animateTo(changes, animationOptions, callbacks) {
        let startTime;
        const addChanges = [];
        const otherChanges = [];
        for (let change of changes) {
            switch (change.type) {
                case 'merge': {
                    const {src, target, value} = change.options;
                    for (let s of src) {
                        if (s[0] === target[0] || s[1] === target[1]) {
                            const distance = s[0] === target[0] ? target[1] - s[1] : target[0] - s[0];
                            otherChanges.push({
                                element: cells[s[0] * n + s[1]],
                                property: 'transform',
                                format: s[0] === target[0] ? "translate({value}px, 0)" : "translate(0, {value}px)",
                                startValue: 0,
                                endValue: distance * cellWidth
                            })
                        }
                    }
                    addChanges.push({
                        element: cells[target[0] * n + target[1]],
                        property: 'transform',
                        format: "scale({value})",
                        startValue: 0,
                        endValue: 1,
                        innerHTML: Number(value),
                        type: change.type
                    })
                    break;
                }
                case 'move': {
                    const {src, target} = change.options;
                    if (src[0] === target[0] || src[1] === target[1]) {
                        const distance = src[0] === target[0] ? target[1] - src[1] : target[0] - src[0];
                        otherChanges.push({
                            element: cells[src[0] * n + src[1]],
                            property: 'transform',
                            format: src[0] === target[0] ? "translate({value}px, 0)" : "translate(0, {value}px)",
                            startValue: 0,
                            endValue: distance * cellWidth
                        })
                    }
                    break;
                }
                case 'add': {
                    const {target, value} = change.options;
                    addChanges.push({
                        element: cells[target[0] * n + target[1]],
                        property: 'transform',
                        format: "scale({value})",
                        startValue: 0,
                        endValue: 1,
                        innerHTML: Number(value),
                        type: change.type
                    })
                    break;
                }
            }
        }

        function appearAnimation() {
            let progress = Math.min(1, (Date.now() - startTime) / animationOptions.duration);
            for (let options of addChanges) {
                if (options.type === 'merge') {
                    progress = progress < 0.5 ? 2.2 * progress : 1.2 - 0.2 * progress;
                }
                options.element.style[options.property] = options.format.replace("{value}", (options.endValue * progress).toString());
            }
            if (progress !== 1) {
                requestAnimationFrame(appearAnimation);
            }
        }

        function moveAnimation() {
            const progress = Math.min(1, (Date.now() - startTime) / animationOptions.duration);
            for (let options of otherChanges) {
                options.element.style[options.property] = options.format.replace("{value}", (options.endValue * progress).toString());
            }
            if (progress !== 1) {
                requestAnimationFrame(moveAnimation);
            } else {
                callbacks?.onFinish?.();
                if (otherChanges.length) {
                    startTime = Date.now();
                    requestAnimationFrame(appearAnimation);
                }
            }
        }

        startTime = Date.now();
        requestAnimationFrame(moveAnimation);
    }

    // 合并规则
    // 1. 只合并相同数字的
    // 2. 只合并相邻的
    // 3. 每个数字最多算一次
    /**
     * @param index 下标，对应行或列的下标
     * @param indexType 0: 行， 1： 列
     * @param isReverse 方向是否反转，默认从上到下，从左到右
     */
    function cellMerge(index, indexType, isReverse = false) {
        let currentIndex = isReverse ? n - 1 : 0;
        const changes = [];
        for (let i = 0; i < n; i++) {
            let useIndex = isReverse ? n - i - 1 : i;
            let currentVal = indexType === 0 ? arr[index][useIndex] : arr[useIndex][index];
            let nextIndex = -1;
            let nextVal = -1;
            if (currentVal === null) continue;
            while (i + 1 < n) {
                i++;
                nextIndex = isReverse ? n - i - 1 : i;
                nextVal = indexType === 0 ? arr[index][nextIndex] : arr[nextIndex][index];
                if (nextVal) {
                    break;
                }
            }
            if (nextVal !== -1 && currentVal !== nextVal) {
                i--;
            }
            if (currentVal === nextVal) {
                changes.push({
                    type: 'merge',
                    options: {
                        src: [indexType === 0 ? [index, useIndex] : [useIndex, index], indexType === 0 ? [index, nextIndex] : [nextIndex, index]],
                        target: indexType === 0 ? [index, currentIndex] : [currentIndex, index],
                        value: 2 * currentVal
                    }
                });
                score += 2 * currentVal;
                unDealCount--;
            } else if (useIndex !== currentIndex) {
                changes.push({
                    type: 'move',
                    options: {
                        src: indexType === 0 ? [index, useIndex] : [useIndex, index],
                        target: indexType === 0 ? [index, currentIndex] : [currentIndex, index]
                    }
                });
            }
            if (isReverse) currentIndex--
            else currentIndex++
        }
        return changes
    }

    /**
     * 应用变更，将arr的值更新
     * @param changes
     */
    function useChanges(changes) {
        changes.forEach((item) => {
            switch (item.type) {
                case 'merge': {
                    const {src, target, value} = item.options;
                    arr[src[0][0]][src[0][1]] = null;
                    arr[src[1][0]][src[1][1]] = null;
                    arr[target[0]][target[1]] = value;
                    break;
                }
                case 'move': {
                    const {src, target} = item.options;
                    const value = arr[src[0]][src[1]];
                    arr[src[0]][src[1]] = null;
                    arr[target[0]][target[1]] = value;
                    break;
                }
                case 'add': {
                    const {target, value} = item.options;
                    arr[target[0]][target[1]] = value;
                    break;
                }
            }
        })
    }

    /**
     * 执行合并
     * @param direction 方向
     */
    function runMerge(direction) {
        const changes = [];
        switch (direction) {
            case "ArrowUp":
                for (let i = 0; i < n; i++) {
                    changes.push(...cellMerge(i, 1, false));
                }
                break
            case "ArrowDown":
                for (let i = 0; i < n; i++) {
                    changes.push(...cellMerge(i, 1, true));
                }
                break
            case "ArrowLeft":
                for (let i = 0; i < n; i++) {
                    changes.push(...cellMerge(i, 0, false));
                }
                break
            case "ArrowRight":
                for (let i = 0; i < n; i++) {
                    changes.push(...cellMerge(i, 0, true));
                }
                break
            default:
                return
        }
        if (changes.length) {
            useChanges(changes);
            const {isOver, change} = genRandomNumber();
            changes.push(change);
            animateTo(changes, {
                duration: 150
            }, {
                onFinish: () => {
                    draw();
                    isOver && console.log("你已经没有可合成的方格了");
                }
            })
        }
    }

    /**
     * 在随机一个空格生成数字
     * @returns {{change: {type: string}, isOver: boolean}} 是否还有可合成的方格
     */
    function genRandomNumber() {
        const val = Math.random() > 0.5 ? 4 : 2;
        const change = {
            type: 'add'
        }
        let targetIndex = Math.floor(Math.random() * (n * n - unDealCount))
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                if (arr[i][j]) continue
                if (targetIndex <= 0) {
                    arr[i][j] = val;
                    unDealCount++;
                    change.options = {
                        target: [i, j],
                        value: val
                    }
                    return {
                        isOver: isOver(),
                        change
                    }
                }
                targetIndex--
            }
        }
    }

    function isOver() {
        if (unDealCount < n * n) return false
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                for (let d of direction) {
                    const nextI = i + d[0]
                    const nextJ = j + d[1]
                    if (nextI >= 0
                        && nextI < n
                        && nextJ >= 0
                        && nextJ < n
                        && (arr[i][j] === arr[nextI][nextJ] || arr[nextI][nextJ] === null)
                    ) {
                        return false
                    }
                }
            }
        }
        return true
    }

    function startNew(config) {
        unDealCount = config?.unDealCount || 0;
        score = config?.score || 0;
        arr = config?.arr || Array.from({length: n}, () => Array.from({length: n}).fill(null));
        if (!unDealCount) {
            genRandomNumber()
        }
        draw()
    }

    // 只支持1——2048之间的数值判断
    function numLen(num) {
        if (num > 999) {
            return 4
        } else if (num > 99) {
            return 3
        } else if (num > 9) {
            return 2
        } else {
            return 1
        }
    }
})()