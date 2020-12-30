//定义画布
var canvas;
//右键菜单项
var contextMenuItems;
//气泡循环动画对象
var bubbleIntervalAnimates=[];

//对象的拓展方法(获取Id)
fabric.Object.prototype.getObjId = function () {
    return this.get('id');
};

//禁用所有对象的控制和选择框
// fabric.Object.prototype.hasControls = false;
// fabric.Object.prototype.hasBorders = false;

//矩形背景
class RectBase {
    constructor(width = 100, height = 150, backgroundColor = 'lightblue', borderRadius = 3, border = 'blue', borderWidth = 3) {
        this.width = width;
        this.height = height;
        this.backgroundColor = backgroundColor;
        this.border = border;
        this.borderRadius = borderRadius;
        this.stroke = border;
        this.strokeWidth = borderWidth;
    }
    createRect = () => new fabric.Rect({
        width: this.width,
        height: this.height,
        fill: this.backgroundColor,
        opacity: 0.7,
        rx: this.borderRadius,
        ry: this.borderRadius,
        stroke: this.stroke,
        strokeWidth: this.strokeWidth,
    });
}

//内容文本
class TextboxBase {
    constructor(text = '默认显示文本', fontSize = 14, fontWeight = 'normal', lineHeight = 1, textAlign = 'left', color = 'white') {
        this.text = text;
        this.fontSize = fontSize;
        this.fontWeight = fontWeight;
        this.lineHeight = lineHeight;
        this.textAlign = textAlign;
        this.color = color;
    }
    createTextbox = () => new fabric.Textbox(this.text, {
        fontSize: this.fontSize,
        fontWeight: this.fontWeight,
        lineHeight: this.lineHeight,
        textAlign: this.textAlign,
        fill: this.color,
    });
}

//设备
class BubbleBase {
    constructor(locationX, locationY, bubbleBackgound, bubbleTitle, bubbleContent) {
        this.locationX = locationX;
        this.locationY = locationY;
        this.bubbleBackgound = bubbleBackgound;
        this.bubbleTitle = bubbleTitle;
        this.bubbleContent = bubbleContent;
    };

    createBubble = () => new fabric.Group([this.bubbleBackgound, this.bubbleTitle, this.bubbleContent], {
        left: this.locationX,
        top: this.locationY,
        width: this.bubbleBackgound.width,
        height: this.bubbleBackgound.height,
        originX: 'center',
        originY: 'center'
    });
};

//初始化场景
var initScene = function (canvasId, width = innerWidth, height = innerHeight, backgoundImg = undefined, isEditor = false) {
    canvas = new fabric.Canvas(canvasId);
    if (!isEditor) {
        //禁用右键
        fabric.util.addListener(document.getElementsByClassName('upper-canvas')[0], 'contextmenu', function (e) {
            e.preventDefault();
        });    
        canvas.hoverCursor = 'pointer';
    } else {
        //添加右键菜单监听事件
        $(".upper-canvas").contextmenu(onContextmenu);

        //初始化右键菜单
        $.contextMenu({
            selector: '#contextmenu-output',
            trigger: 'none',
            build: function ($trigger, e) {
                //The build method of the build menu item will be executed every right click
                return {
                    callback: contextMenuClick,
                    items: contextMenuItems
                };
            },
        });
        //选中对象事件（这里禁止对象多选，和获取对象Id）
        canvas.on('selection:created', (e) => {
            if (e.target.type === 'activeSelection') {
                canvas.discardActiveObject();
            }
            //console.log(e.target.getObjId()); //获取对象Id
        });

        //双击事件（这里设置双击获取气泡的属性）
        canvas.on('mouse:dblclick', (e) => {
            showBubbleProperty(e.target.getObjects());
            console.log(e.target)
        })

        //选中对象更新事件（这里设置获取气泡的Id）
        canvas.on('selection:updated', function (e) {
            //console.log(e.target.getObjId());
        });
    }
    canvas.setWidth(width);
    canvas.setHeight(height);
    canvas.loadFromJSON(localStorage.getItem('scene'));
    if (backgoundImg != undefined) {
        //设置底图适应画布大小（机房平面图）
        fabric.Image.fromURL(backgoundImg, function (img) {
            canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas), {
                originX: 'left',
                originY: 'top',
                scaleX: canvas.width / img.width,
                scaleY: canvas.width / img.width,
            });
        });
    }

    //resizeCanvas();
    //滚轮缩放
    canvas.on('mouse:wheel', function (opt) {
        var evt = opt.e;
        if (evt.altKey === true) {
            var delta = opt.e.deltaY; //这个值稍微有点复杂，不同浏览器的值都不一样，chrome是+-100，firefox是+-3
            var zoom = canvas.getZoom();
            // if (delta > 0)
            //     zoom -= 0.1;
            // else
            //     zoom += 0.1;
            //console.log(zoom);
            zoom *= 0.999 ** delta; //这个公式是按chrome去写的，如果在firefox上面体验会比较差

            if (zoom > 20) zoom = 20; //放大最大值20倍
            if (zoom < 0.01) zoom = 0.01; //放大最小值（1为不缩小）
            canvas.zoomToPoint({
                x: opt.e.offsetX,
                y: opt.e.offsetY
            }, zoom);
            opt.e.preventDefault();
            opt.e.stopPropagation();
        }

    });

    //鼠标按下可拖拽
    canvas.on('mouse:down', function (opt) {
        var evt = opt.e;
        if (evt.altKey === true) {
            this.isDragging = true;
            this.selection = false;
            this.lastPosX = evt.clientX;
            this.lastPosY = evt.clientY;
        }
    });

    //鼠标移动
    canvas.on('mouse:move', function (opt) {
        if (this.isDragging) {
            var e = opt.e;
            var vpt = this.viewportTransform;
            vpt[4] += e.clientX - this.lastPosX;
            vpt[5] += e.clientY - this.lastPosY;
            this.requestRenderAll();
            this.lastPosX = e.clientX;
            this.lastPosY = e.clientY;
        }
        if (isEditor) {
            enableSelection();
        } else {

            disableSelection();
        }
    });

    //释放鼠标
    canvas.on('mouse:up', function (opt) {
        //获取移动后的气泡信息
        let bubble = opt.target;
        if (bubble != null) {
            let left = bubble.left;
            let top = bubble.top;
        }
        this.setViewportTransform(this.viewportTransform);
        this.isDragging = false;
        this.selection = true;
    });
};

//启用编辑功能
var enableSelection = function () {
    canvas.selection = false;
    canvas.getObjects().forEach(function (o) {
        o.set('selectable', true);
    });
    //canvas.off('mouse:wheel'); 关闭鼠标滚轮事件
    //canvas.__eventListeners = {} 关闭所有事件
};

//禁用编辑功能
var disableSelection = function () {
    this.canvas.selection = false;
    this.canvas.getObjects().forEach(function (o) {
        o.set('selectable', false);
    });
    this.canvas.discardActiveObject();
}

//保存场景
var saveScene = function () {
    localStorage.setItem('scene', JSON.stringify(canvas));
    canvas.requestRenderAll(); //追加渲染    
};

//删除选中的气泡
var removeSelectBubble = function () {
    canvas.remove(canvas.getActiveObject());
};

//添加气泡
var addBubble = function (left, top, id, title, titleFontSize, titleFontWeight, content, contentFontSize, contentFontWeight, padding) {
    let bubbleTitle = new TextboxBase(title, titleFontSize, titleFontWeight, ).createTextbox();
    let bubbleContent = new TextboxBase(content, contentFontSize, contentFontWeight).createTextbox();
    let width = bubbleTitle.get('width') > bubbleContent.get('width') ? bubbleTitle.get('width') : bubbleContent.get('width');
    let height = bubbleTitle.get('height') + bubbleContent.get('height');
    let bubbleBackgound = new RectBase(width + padding * 2, height + padding * 2, 'lightblue', 3).createRect();
    bubbleTitle.set({
        top: padding,
        textAlign: 'left',
        left: bubbleBackgound.left + (bubbleBackgound.width - width) / 2
    });
    bubbleContent.set({
        top: bubbleTitle.get('height') + padding,
        textAlign: 'left',
        left: bubbleBackgound.left + (bubbleBackgound.width - width) / 2
    });
    let bubble = new BubbleBase(left, top, bubbleBackgound, bubbleTitle, bubbleContent).createBubble();
    //给设备拓展属性，这里加上设备id
    bubble.toObject = (function (toObject) {
        return function () {
            return fabric.util.object.extend(toObject.call(this), {
                id: this.id
            });
        };
    })(bubble.toObject);
    let scaleX = canvas.width / canvas.backgroundImage.width;
    let scaleY = canvas.width / canvas.backgroundImage.width;
    bubble.set({
        scaleX: scaleX,
        scaleY: scaleY,
    })
    bubble.id = id;
    canvas.add(bubble);
    bubble.set({
        opacity: 0,
        shadow: new fabric.Shadow({
            color: 'black',
            blur: 30
        })
    });   
    bubble.animate({
        opacity: 1
    }, {
        duration: 300,
        onChange: canvas.renderAll.bind(canvas),
        easing: fabric.util.easeInOutBack
    });
    
    //开启循环动画
    //BubbleAnimate(bubble);
    //关闭循环动画
    //setTimeout(ClearBubbleInterval,2000);
};

//气泡循环动画
var BubbleAnimate = function (bubble, interval = 500) {
    let oldScaleX = bubble.scaleX;
    let oldScaleY = bubble.scaleY;
    let newScaleX = oldScaleX * 1.05;
    let newScaleY = oldScaleY * 1.05;
    bubble.set({
        shadow: new fabric.Shadow({
            color: 'red',
            blur: 30
        })
    });
    bubbleIntervalAnimate = setInterval(function () {
        if (bubble.scaleX < newScaleX) {   
            bubble.set({
                shadow: new fabric.Shadow({
                    color: 'red',
                    blur: 10
                })
            });        
            bubble.animate({
                scaleX: newScaleX,
                scaleY: newScaleY,                    
            }, {
                duration: 300,
                onChange: canvas.renderAll.bind(canvas),
                easing: fabric.util.easeInOutBounce
            });            
        } else {
            bubble.set({
                shadow: new fabric.Shadow({
                    color: 'red',
                    blur: 30
                })
            });
            bubble.animate({
                scaleX: oldScaleX,
                scaleY: oldScaleY,                         
            }, {
                duration: 300,
                onChange: canvas.renderAll.bind(canvas),
                easing: fabric.util.easeInOutBounce
            });           
        }

    }, interval);
}

//清除循环动画
var ClearBubbleInterval = function () {
    clearInterval(bubbleIntervalAnimate);
}

//添加默认气泡
var AddDefaultBubble = function (left = undefined, top = undefined) {
    let title = '冷通道';
    let titleFontSize = 14;
    let titleFontWeight = 'bold';
    let content = '温度：32度\n湿度：60%\n温度温度：32度\n湿度湿度：60%';
    let contentFontSize = 12;
    let contentFontWeight = 'normal';
    let padding = 10;
    if (top == undefined)
        top = Math.floor(Math.random() * 400);
    if (left == undefined)
        left = Math.floor(Math.random() * 400);
    // let top = 200;
    // let left = 200;
    let id = Math.floor(Math.random() * 100);
    addBubble(left, top, id, title, titleFontSize, titleFontWeight, content, contentFontSize, contentFontWeight, padding);
};

//更新气泡内容
var updateBubbleData = function (id, title, content) {
    let bubbles = canvas.getObjects();
    bubbles.forEach((bubble) => {
        if (bubble.get('id') == id) {
            bubble.item(1).set('text', title);
            bubble.item(2).set('text', content);
            let height = bubble.item(1).get('height') + bubble.item(2).get('height');
            bubble.item(0).set({
                'height': height + 20
            });
        }
        bubble.set({
            'height': bubble.item(0).get('height')
        });
    })

    canvas.requestRenderAll();
};

//展示气泡属性
var showBubbleProperty = function (bubble) {
    document.getElementById('BubbleStyle').style.display = 'block';
    let backgound = bubble[0];
    let title = bubble[1];
    let content = bubble[2];
    document.getElementById('titleFontSize').value = title.fontSize;
    document.getElementById('titleFontWeight').value = title.fontWeight;
    document.getElementById('contentFontSize').value = content.fontSize;
    document.getElementById('contentFontWeight').value = content.fontWeight;
    document.getElementById('contentLineHeight：').value = title.lineHeight;
    document.getElementById('bubbleBackgoundColor').value = backgound.fill;
    document.getElementById('bubbleBorderColor').value = backgound.stroke;
    document.getElementById('bubbleBorderWidth').value = backgound.strokeWidth;
    document.getElementById('bubbleAlign').value = title.textAlign;
};

//测试更新气泡样式
var testUpdateBubbleStyle = function () {
    let titleFontSize = Number(document.getElementById('titleFontSize').value);
    let titleFontWeight = document.getElementById('titleFontWeight').value;
    let contentFontSize = Number(document.getElementById('contentFontSize').value);
    let contentFontWeight = document.getElementById('contentFontWeight').value;
    let contentLineHeight = Number(document.getElementById('contentLineHeight：').value);
    let backgoundColor = document.getElementById('bubbleBackgoundColor').value;
    let borderColor = document.getElementById('bubbleBorderColor').value;
    let borderWidth = Number(document.getElementById('bubbleBorderWidth').value);
    let align = document.getElementById('bubbleAlign').value;
    updateBubbleSytle(titleFontSize, titleFontWeight, contentFontSize, contentFontWeight, contentLineHeight, backgoundColor, borderWidth, borderColor, align);
};

//关闭气泡样式
var closeBubbleStyle = function () {
    document.getElementById('BubbleStyle').style.display = 'none';
};

//更新选中气泡样式
var updateBubbleSytle = function (titleFontSize, titleFontWeight, contentFontSize, contentFontWeight, lineHeight, backgoundColor, borderWidth, borderColor, align) {
    let bubble = canvas.getActiveObject();
    let backgound = bubble.item(0);
    let title = bubble.item(1);
    let content = bubble.item(2);
    backgound.set({
        fill: backgoundColor,
        stroke: borderColor,
        strokeWidth: borderWidth,
    });
    title.set({
        fontSize: titleFontSize,
        fontWeight: titleFontWeight,
    });
    content.set({
        fontSize: contentFontSize,
        fontWeight: contentFontWeight,
        lineHeight: lineHeight,
    })
    let width = title.width > content.width ? title.width : content.width;
    if (align === 'left') {
        title.set({
            textAlign: 'left',
            left: backgound.left + (backgound.width - width) / 2
        });
        content.set({
            textAlign: 'left',
            left: backgound.left + (backgound.width - width) / 2
        });
    } else if (align === 'right') {
        title.set({
            textAlign: 'right',
            left: backgound.left + (content.width - title.width) + (backgound.width - width) / 2
        });
        content.set({
            textAlign: 'right',
            left: backgound.left + (backgound.width - width) / 2
        });

    } else {
        title.set({
            textAlign: 'center',
            left: backgound.left + (content.width - title.width) / 2 + (backgound.width - width) / 2
        });
        content.set({
            textAlign: 'center',
            left: backgound.left + (backgound.width - width) / 2
        });
    }
    title.setCoords();
    content.setCoords();
    canvas.requestRenderAll();
};

//获取所有气泡Id
var getAllBubbleIds = function () {
    let ids = [];
    canvas.getObjects().forEach((obj) => {
        ids.push(obj.getObjId());
    })
    console.log(ids);
    return ids;
};

//获取选中气泡Id
var getBubbleId = function () {
    let selectedBubble = canvas.getActiveObject();
    if (selectedBubble != null) {
        let id = selectedBubble.getObjId();
        console.log(selectedBubble.getObjId());
        return id;
    }
};

function resizeCanvas() {
    const outerCanvasContainer = $('.fabric-canvas-wrapper')[0];

    const ratio = canvas.getWidth() / canvas.getHeight();
    const containerWidth = outerCanvasContainer.clientWidth;
    const containerHeight = outerCanvasContainer.clientHeight;

    const scale = containerWidth / canvas.getWidth();
    const zoom = canvas.getZoom() * scale;
    canvas.setDimensions({
        width: containerWidth,
        height: containerWidth / ratio
    });
    canvas.setViewportTransform([zoom, 0, 0, zoom, 0, 0]);
}

$(window).resize(resizeCanvas);

//鼠标右键菜单事件
function onContextmenu(event) {
    var object = canvas.getActiveObject();
    if (object != null) {
        let isInX = event.originalEvent.layerX >= object.lineCoords.bl.x && event.originalEvent.layerX <= object.lineCoords.br.x;
        let isInY = event.originalEvent.layerY >= object.lineCoords.tl.y && event.originalEvent.layerY <= object.lineCoords.bl.y;
        //如果鼠标在物体内则显示右键菜单
        if (isInX && isInY) {
            showContextMenu(event, object);
        }
    } else {
        showAddContextMenu(event);
    }
    //阻止默认事件
    event.preventDefault();
    return false;
}

//显示右键菜单页面
function showContextMenu(event, object) {
    //菜单项，需要什么操作就添加对应的键值对就可以了
    contextMenuItems = {
        "delete": {
            name: "删除",
            icon: "delete",
            data: object
        },
        "add": {
            name: "添加",
            icon: "add",
            data: object
        },
    };
    //邮件菜单显示位置
    var position = {
        x: event.clientX,
        y: event.clientY
    }
    $('#contextmenu-output').contextMenu(position);
}

//显示右键菜单页面
function showAddContextMenu(event) {
    //菜单项，需要什么操作就添加对应的键值对就可以了
    contextMenuItems = {
        "add": {
            name: "添加",
            icon: "add",
            data: event
        },
    };
    //邮件菜单显示位置
    var position = {
        x: event.clientX,
        y: event.clientY
    }
    $('#contextmenu-output').contextMenu(position);
}

//菜单点击事件
function contextMenuClick(key) {
    console.log(contextMenuItems[key].data);
    if (key == "delete") {
        //获取对象
        var object = contextMenuItems[key].data;
        canvas.remove(object);
    } else if (key = "add") {
        //获取对象
        var event = contextMenuItems[key].data;
        var pointer = canvas.getPointer(event);
        AddDefaultBubble(pointer.x, pointer.y);
    }
}