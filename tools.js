export function chooseOneFrom(array) {
    let index = Math.floor(Math.random() * array.length);
    return array[index];
}


export function isWiderThanStage(shape, stage, percentage = 0.9) {
    return shape.width() * shape.scale().x > stage.width() * percentage;
}


export function shrinkToFitStage(shape) {
    shape.scaleX(shape.scale().x * 0.9).scaleY(shape.scale().y * 0.9);
    return true;
}


export function centerShape(shape) {
    shape.offsetX(shape.width() / 2).offsetY(shape.height() / 2);
    return shape;
}

export function shapesTooClose(s1, s2, min) {
    if (!s1 || !s2 || !min) return false;
    const distance = Math.hypot(s1.x() - s2.x(), s1.y() - s2.y());
    return distance < min;
}

export function isOffStage(shape, stage, buffer = 0) {
    const left = shape.x() < -buffer;
    const right = shape.x() > stage.width() + buffer;
    const up = shape.y() < -buffer;
    const down = shape.y() > stage.height() + buffer;
    return left || right || up || down;
}

export function keepOnStage(shape, stage) {

    const height = shape.height() / 2;

    if (shape.x() + height < 0) shape.x(stage.width() + height);
    if (shape.x() - height > stage.width()) shape.x(-height);
    if (shape.y() + height < 0) shape.y(stage.height() + height);
    if (shape.y() - height > stage.height()) shape.y(-height);

    return true;
}



