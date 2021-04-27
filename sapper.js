"use strict"

function getRandomInt(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

class Timer {
	constructor(htmlElement) {
		this._element = htmlElement;
		this._timerID = null;
		this._startTimestamp = 0;
		this._update = function() {
			const diff = Math.floor( (Date.now() - this._startTimestamp) / 1000 );
			this._element.textContent = diff;
			this._timerID = setTimeout(() => this._update(), 1000);
		};
	}
	start() {
		this.stop();
		this._startTimestamp = Date.now();
		this._update();
	}
	stop() {
		if (this._timerID !== null) {
			clearTimeout(this._timerID);
			this._timerID = null;
		}
	}
	next() {
		if (this._timerID === null)
			this.start();
	}
	clear() {
		this._element.textContent = "0";
	}
}

class RangeUnit {
	constructor(unit) {
		this._unit   = unit;
		this._range  = unit.querySelector("input");
		this._left   = unit.querySelector(".range-cell-11");
		this._center = unit.querySelector(".range-cell-12");
		this._right  = unit.querySelector(".range-cell-13");
	}
	setState(state = {}) {
		let {min, max, step, value} = state;
	
		if (min !== undefined) {
			this._range.min = min;
			this._left.textContent = this._range.min;
		}
		if (max !== undefined) {
			this._range.max = max;
			this._right.textContent = this._range.max;
		}
		if (step !== undefined)
			this._range.step = step;
		if (value !== undefined) {
			this._range.value = value;
			this._center.textContent = this._range.value;
		}
	}
	getState() {
		return {
			min:   Number(this._range.min),
			max:   Number(this._range.max),
			step:  Number(this._range.step),
			value: Number(this._range.value),
		};
	}
	getHTMLState() {
		return {
			min:   this._range.getAttribute("min"),
			max:   this._range.getAttribute("max"),
			step:  this._range.getAttribute("step"),
			value: this._range.getAttribute("value"),
		};
	}
	getID() {
		return this._unit.id;
	}
	getUnit() {
		return this._unit;
	}
}

function Sapper()
{
	function Painter(srcImage, canvas, fieldWidth, fieldHeight)
	{
		if (new.target === undefined)
			return;
		
		const cellWidth  = 16;
		const cellHeight = 16;
		
		canvas.width  = cellWidth  * fieldWidth;
		canvas.height = cellHeight * fieldHeight;
		
		let context = canvas.getContext("2d");
		//context.imageSmoothingEnabled = false;
		//context.mozImageSmoothingEnabled = false;
		
		function drawCell(x, y, cellType) {
			const src = {
				"closed": {x: 0, y: 2},
				"opened": {x: 1, y: 2},
				"1": {x: 0, y: 0},
				"2": {x: 1, y: 0},
				"3": {x: 2, y: 0},
				"4": {x: 0, y: 1},
				"5": {x: 1, y: 1},
				"6": {x: 2, y: 1},
				"7": {x: 2, y: 2},
				"8": {x: 2, y: 3},
				"bomb_marked": {x: 0, y: 3},
				"question": {x: 1, y: 3},
				"bomb": {x: 0, y: 4},
				"bomb_exploded": {x: 1, y: 4},
				"bomb_marked_incorrectly": {x: 2, y: 4},
			};
			
			--x;
			--y;
			context.drawImage(srcImage, src[cellType].x * cellWidth, src[cellType].y * cellHeight,
				cellWidth, cellHeight,
				x * cellWidth, y * cellHeight, cellWidth, cellHeight);
		}
		
		this.drawCell = drawCell;
	}
	function Field(fieldWidth, fieldHeight) {
		if (new.target === undefined)
			return;
		
		let buff = [];
		for (let i = 0; i < (fieldHeight + 2) * (fieldWidth + 2); ++i)
			buff.push("border");
		
		function get(x, y) {
			return buff[y * (fieldWidth + 2) + x];
		}
		function set(x, y, value){
			buff[y * (fieldWidth + 2) + x] = value;
		}
		
		this.get = get;
		this.set = set;
	}
	
	function drawAllBombs(gameState, bombType) {
		for (let y = 1; y <= gameState.fieldHeight; ++y)
			for (let x = 1; x <= gameState.fieldWidth; ++x)
				if (gameState.fieldHidden.get(x,y) === "bomb") {
					let cellVisible = gameState.fieldVisible.get(x, y);
					if (cellVisible == "closed" || cellVisible == "question") {
						gameState.fieldVisible.set(x, y, bombType);
						gameState.painter.drawCell(x, y, bombType);
					}
				}
				else if (gameState.fieldVisible.get(x, y) === "bomb_marked") {
					gameState.fieldVisible.set(x, y, "bomb_marked_incorrectly");
					gameState.painter.drawCell(x, y, "bomb_marked_incorrectly");
				}
	}
	function closeAllField(gameState) {
		for (let y = 1; y <= gameState.fieldHeight; ++y)
			for (let x = 1; x <= gameState.fieldWidth; ++x) {
				gameState.fieldVisible.set(x, y, "closed");
				gameState.painter.drawCell(x, y, "closed");
			}
	}
	function generateNewField(gameState) {
		const numOfBombs  = gameState.numOfBombsAll;
		const fieldWidth  = gameState.fieldWidth;
		const fieldHeight = gameState.fieldHeight;
		const fieldSize = fieldHeight * fieldWidth;
		
		let indexArray = [];
		for (let y = 1; y <= fieldHeight; ++y)
			for (let x = 1; x <= fieldWidth; ++x) {
				gameState.fieldHidden.set(x, y, "opened");
				indexArray.push(y * (fieldWidth + 2) + x);
			}
		
		for (let i = 0; i < numOfBombs; ++i) {
			let pos = getRandomInt(i, fieldSize - 1);
			
			let buff = indexArray[pos];
			indexArray[pos] = indexArray[i];
			
			let y = Math.floor(buff / (fieldWidth + 2));
			let x = buff - y * (fieldWidth + 2);
			gameState.fieldHidden.set(x, y, "bomb");
		}
		
		for (let y = 1; y <= fieldHeight; ++y)
			for (let x = 1; x <= fieldWidth; ++x)
				if (gameState.fieldHidden.get(x, y) === "opened") {
					let bombCounter = 0;
					for (let yd = y - 1; yd <= y + 1; ++yd)
						for (let xd = x - 1; xd <= x + 1; ++xd)
							if (gameState.fieldHidden.get(xd, yd) === "bomb")
								++bombCounter;
					
					if (bombCounter > 0)
						gameState.fieldHidden.set(x, y, String(bombCounter));
				}
	}
	
	function clickLeft(gameState, x, y) {
		const stateWin  = "win";
		const stateLose = "lose";
		const statePlay = "play";
		
		if (gameState.fieldVisible.get(x, y) === "closed") {
			if (gameState.fieldHidden.get(x, y) === "bomb") {
				gameState.fieldVisible.set(x, y, "bomb_exploded");
				gameState.painter.drawCell(x, y, "bomb_exploded");
				drawAllBombs(gameState, "bomb");
				
				return stateLose;
			}
			
			let cellHidden = gameState.fieldHidden.get(x, y);
			gameState.fieldVisible.set(x, y, cellHidden);
			gameState.painter.drawCell(x, y, cellHidden);
			--gameState.numOfCellsClosed;
			
			let coords = [[x, y]];
			if (cellHidden === "opened")
				while (coords.length > 0) {
					let nextCoords = [];
					for (let coord of coords) {
						let [x, y] = coord;
						for (let dy = y - 1; dy <= y + 1; ++dy)
							for (let dx = x - 1; dx <= x + 1; ++dx)
								if (gameState.fieldVisible.get(dx, dy) === "closed") {
									let cellHidden = gameState.fieldHidden.get(dx, dy);
									if (cellHidden !== "bomb") {
										gameState.fieldVisible.set(dx, dy, cellHidden);
										gameState.painter.drawCell(dx, dy, cellHidden);
										--gameState.numOfCellsClosed;
										if (cellHidden === "opened")
											nextCoords.push([dx, dy]);
									}
								}
					}
					coords = nextCoords;
				}
			
			if (gameState.numOfBombsAll === gameState.numOfCellsClosed) {
				gameState.numOfBombsMarked = gameState.numOfBombsAll;
				drawAllBombs(gameState, "bomb_marked");
				return stateWin;
			}
		}
		return statePlay;
	}
	function clickRight(gameState, x, y) {
		let cellVisible = gameState.fieldVisible.get(x, y);
		
		switch (cellVisible) {
			case "closed":
				gameState.fieldVisible.set(x, y, "bomb_marked");
				gameState.painter.drawCell(x, y, "bomb_marked");
				++gameState.numOfBombsMarked;
				break;
			case "bomb_marked":
				gameState.fieldVisible.set(x, y, "question");
				gameState.painter.drawCell(x, y, "question");
				--gameState.numOfBombsMarked;
				break;
			case "question":
				gameState.fieldVisible.set(x, y, "closed");
				gameState.painter.drawCell(x, y, "closed");
				break;
		}
	}
	
	function eventHandler(e, gameState) {
		e.preventDefault();
		
		if (gameState.gameState !== "work")
			return;
		
		const cellWidth  = 16;
		const cellHeight = 16;
		
		let x = e.pageX - e.currentTarget.offsetLeft - e.currentTarget.clientLeft;
		let y = e.pageY - e.currentTarget.offsetTop  - e.currentTarget.clientTop;
		
		if (x < 0 ||
			x >= e.currentTarget.width ||
			y < 0 ||
			y >= e.currentTarget.height)
		{
			return;
		}
		
		x = Math.floor(x / cellWidth)  + 1;
		y = Math.floor(y / cellHeight) + 1;
		
		gameState.timer.next();
		
		switch (e.type) {
			case "click":
				let res = clickLeft(gameState, x, y);
				if (res === "win") {
					gameState.timer.stop();
					alert("Победа!");
					gameState.gameState = "win";
				}
				else if (res === "lose") {
					gameState.timer.stop();
					alert("Проигрыш");
					gameState.gameState = "lose";
				}
				break;
			case "contextmenu":
				clickRight(gameState, x, y);
				break;
		}
		
		gameState.bombsElement.textContent = gameState.numOfBombsAll - gameState.numOfBombsMarked;
	}
	
	function createNewGameState(options) {
		if (options.numOfBombsAll >= options.fieldWidth * options.fieldHeight || options.numOfBombsAll < 1)
			throw new Error("Sapper::prepare error!");
		
		let gameState = {
			fieldWidth:  options.fieldWidth,
			fieldHeight: options.fieldHeight,
			
			painter: new Painter(
				options.srcImage, options.canvas,
				options.fieldWidth, options.fieldHeight
			),
			
			timer: options.timer,
			bombsElement: options.bombsElement,
			
			fieldVisible: new Field(options.fieldWidth, options.fieldHeight),
			fieldHidden:  new Field(options.fieldWidth, options.fieldHeight),
			
			numOfBombsAll:    options.numOfBombsAll,
			numOfBombsMarked: 0,
			numOfCellsClosed: options.fieldWidth * options.fieldHeight,
			
			gameState: "work",
		};
		
		closeAllField(gameState);
		generateNewField(gameState);
		
		gameState.timer.stop();
		gameState.timer.clear();
		gameState.bombsElement.textContent = options.numOfBombsAll;
		
		return gameState;
	}
	
	function prepare() {
		function setRangeHandler(rangeWidth, rangeHeight, rangeBombs) {
			let unitToRangeUnit = new Map();
			function handler() {
				let rangeUnit = unitToRangeUnit.get(this);
				rangeUnit.setState({value: rangeUnit.getState().value});
				if (rangeUnit !== rangeBombs) {
					let width  = rangeWidth.getState().value;
					let height = rangeHeight.getState().value;
					let max = width * height - 1;
					
					let {value: bombsValue} = rangeBombs.getState();
					rangeBombs.setState({max: max});
					if (bombsValue > max)
						rangeBombs.setState({value: max});
				}
			}
			
			let buff = [rangeWidth, rangeHeight, rangeBombs];
			for (let range of buff) {
				let {value, min, max} = range.getState();
				range.setState({value, min, max});
				range.getUnit().addEventListener("input", handler);
				unitToRangeUnit.set(range.getUnit(), range);
			}
			handler.call(rangeWidth.getUnit());
		}
		
		const rangeWidth  = new RangeUnit( document.getElementById("range-width") );
		const rangeHeight = new RangeUnit( document.getElementById("range-height") );
		const rangeBombs  = new RangeUnit( document.getElementById("range-bombs") );
		
		setRangeHandler(rangeWidth, rangeHeight, rangeBombs);
		
		const canvas    = document.getElementById("canvas-id");
		const spanTimer = document.getElementById("timer-id");
		const spanBombs = document.getElementById("bombs-id");
		
		const buttonNew = document.getElementById("button-new");
		
		const image = new Image();
		
		const timer = new Timer(spanTimer);
		
		let gameState = null;
		
		function buttonNewHandler() {
			let options = {
				srcImage:      image,
				canvas:        canvas,
				timer:         timer,
				bombsElement:  spanBombs,
				fieldWidth:    rangeWidth.getState().value,
				fieldHeight:   rangeHeight.getState().value,
				numOfBombsAll: rangeBombs.getState().value,
			};
			gameState = createNewGameState(options);
		}
		
		image.onload = function() {
			buttonNewHandler();
			
			buttonNew.addEventListener("click", buttonNewHandler);
			canvas.addEventListener("click",       event => eventHandler(event, gameState));
			canvas.addEventListener("contextmenu", event => eventHandler(event, gameState));
		};
		image.onerror = function() {
			alert("Не удалось загрузить изображение " + this.src);
		}
		image.src = "resource.png";
	}
	prepare();
}

Sapper();














