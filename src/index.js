import React, {
    PureComponent,

    useRef,
} from "react";
import "./styles.scss";
import PropTypes from "prop-types";

const Context = React.createContext();

function getTransformY(node) {
    var previousTranslatedY = node.style.transform;
    var matches = previousTranslatedY.match(/\(([^)]+)\)/); // [1] = some px or null
    previousTranslatedY = matches // some or 0
        ? parseInt(matches[1].substr(0, matches[1].length - 2))
        : 0;
    return previousTranslatedY;
}

export const ActionAnimations = {
    RETURN: Symbol("Return"),
    REMOVE: Symbol("Remove"),
    NONE: Symbol("None"),
};

export const SlippableList = (props) => {
    const SlippableListWrapper = useRef();
    return (
        <div className="slippable-list" ref={SlippableListWrapper}>
            <Context.Provider value={{ SlippableListRef: SlippableListWrapper }}>
                {props.children}
            </Context.Provider>
        </div>
    );
};

export class SlippableListItem extends PureComponent {
    constructor(props) {
        super(props);
        this.listItemRef = null;
        this.mouseDownEle = null;
        this.swipingEleRef = null;
        this.dragState = "UNDECIDED";
        this.left = this.prevLeft = this.top = this.prevTop = 0;
    }

    componentDidMount() {
        this.listItemRef.addEventListener("mousedown", this.handleMouseDown);
    }

    setDragState = (newDragState) => {
        var prevDragState = this.dragState;

        if (newDragState === "REORDER") {
            this.swipingEleRef.className = "swipeable-list-item";
            this.mouseDownEle.className = "slippable-list-item reorder";
        } else {
            this.swipingEleRef.className =
                "swipeable-list-item " + newDragState.toLowerCase();
        }

        this.dragState = newDragState;
    };

    initializeDragPosition = () => {
        this.left = this.prevLeft = 0;
        this.top = this.prevTop = getTransformY(this.mouseDownEle);
    };

    initializeEventsOnMouseDown = () => {
        window.addEventListener("mouseup", this.handleMouseUp);
        window.addEventListener("mousemove", this.handleMouseMove);
    };

    removeOnMouseDownEvents = () => {
        window.removeEventListener("mouseup", this.handleMouseUp);
        window.removeEventListener("mousemove", this.handleMouseMove);
    };

    addReorderTimeout = () => {
        this.swipeOrReorderTimeout = setTimeout(() => {
            if (
                this.left != null &&
                this.top != null &&
                Math.abs(this.left) <= 25 &&
                Math.abs(this.top) <= 15
            ) {
                if (this.mouseDownEle && this.dragState !== "SWIPE") {
                    if (!this.props.blockReorder) {
                        this.setDragState("REORDER");
                        this.initiateReorder();
                    }

                }
            }
        }, 500);
    };

    initiateSwipe = () => {
        // mouseDownEle includes the list item content, and the delete "sidebars"
        // we only want to transform the main list item content, and the sidebars
        // we can call swipingEle.style.transform to only transform the main list item content
    };

    initiateReorder = () => {
        this.initializeChildNodesBound();

        Array.from(this.mouseDownEle.parentNode.childNodes)
            .filter((e) => e !== this.mouseDownEle)
            .forEach((e) => {
                e.classList.toggle("transformYAnimate");
            });

        this.props.onReorderStart();
    };

    initializeChildNodesBound = () => {
        var childNodes = Array.from(this.mouseDownEle.parentNode.childNodes);
        this.childNodesBound = [];
        for (var i = 0; i < childNodes.length; i++) {
            var e = childNodes[i];
            let { top, bottom, height } = e.getBoundingClientRect();
            top += this.context.SlippableListRef.current.scrollTop;
            bottom += this.context.SlippableListRef.current.scrollTop;
            var heightOfNode = height;
            var heightOfMouseDownNode = this.mouseDownEle.getBoundingClientRect()
                .height;
            if (heightOfNode > heightOfMouseDownNode) {
                top = top + (heightOfNode - heightOfMouseDownNode) / 2;
                bottom = bottom - (heightOfNode - heightOfMouseDownNode) / 2;
            }
            this.childNodesBound.push({
                top: top,
                bottom: bottom,
                currentlyAt: i,
            });
        }
    };

    handleMouseDown = (e) => {
        this.mouseDownEle = e.target;
        while (this.mouseDownEle.className !== "slippable-list-item") {
            this.mouseDownEle = this.mouseDownEle.parentNode;
        }
        this.setDragState("UNDECIDED");
        this.initializeDragPosition();
        this.initializeEventsOnMouseDown();
        this.addReorderTimeout();
    };

    handleMouseMove = (e) => {
        if (this.mouseDownEle) {
            this.left = this.prevLeft + e.movementX;
            this.top = this.prevTop + e.movementY;

            switch (this.dragState) {
                case "UNDECIDED":
                    if (Math.abs(this.left) > 25) {
                        if (!this.props.blockSwipe) {

                            this.initiateSwipe();
                            this.setDragState("SWIPE");
                        }

                    }
                    this.prevLeft = this.left;
                    this.prevTop = this.top;
                    break;
                case "SWIPE":
                    this.updateSwipeElement();
                    if (this.swipeLeftRef) {
                        this.updateSwipeLeftContent();
                    }
                    if (this.swipeRightRef) {
                        this.updateSwipeRightContent();
                    }

                    break;
                case "REORDER":
                    if (this.mouseDownEle) {
                        this.top = this.prevTop + e.movementY;
                        this.updateReorderElement();
                    }
                    break;
                default:
                    throw "SlippableListItem should either be in the UNDECIDED or SWIPE state when mouse moves";
            }
        }
    };

    updateReorderElement = () => {
        if (this.mouseDownEle) {
            this.prevTop = this.top;
            this.updateScrolling();
            this.mouseDownEle.style.transform = `translateY(${this.top}px)`;
            this.prevTop = this.top;
            var childNodes = Array.from(this.mouseDownEle.parentNode.childNodes);
            var indexOfMouseDownEle = Array.prototype.indexOf.call(
                childNodes,
                this.mouseDownEle
            );
            const {
                top: mouseDownEleTop,
                bottom: mouseDownEleBot,
            } = this.mouseDownEle.getBoundingClientRect();
            const mouseDownEleCenterY =
                (mouseDownEleTop + mouseDownEleBot) / 2 +
                this.context.SlippableListRef.current.scrollTop;
            var newIndex = this.newIndex;

            if (
                mouseDownEleCenterY < this.childNodesBound[0].bottom &&
                newIndex !== 0
            ) {
                newIndex = 0;
            } else if (
                mouseDownEleCenterY >
                this.childNodesBound[this.childNodesBound.length - 1].top &&
                newIndex !== this.childNodesBound.length - 1
            ) {
                newIndex = this.childNodesBound.length - 1;
            } else {
                var otherElementsBounds = [];
                var matchedRangeIndices = [];
                for (var i = 0; i < this.childNodesBound.length; i++) {
                    var currentChildNode = this.childNodesBound[i];
                    let top = currentChildNode.top;
                    let bottom = currentChildNode.bottom;
                    if (mouseDownEleCenterY > top && mouseDownEleCenterY < bottom) {
                        newIndex = this.childNodesBound[i].currentlyAt;
                    }
                }
            }

            for (var i = 0; i < childNodes.length; i++) {
                if (i == indexOfMouseDownEle) continue;
                if (i >= indexOfMouseDownEle + 1 && i <= newIndex) {
                    // if element is between the original location of the currently dragging element
                    // and where the current drag ele is
                    // change its transformY
                    var previousTranslatedY = getTransformY(childNodes[i]);
                    var translateBy = -(
                        mouseDownEleBot -
                        mouseDownEleTop +
                        this.props.gap
                    );
                    childNodes[i].style.transform = `translateY(${translateBy}px)`;

                    if (previousTranslatedY === 0) {
                        this.childNodesBound[i].top += translateBy;
                        this.childNodesBound[i].bottom += translateBy;
                        this.childNodesBound[i].currentlyAt -= 1;
                    }
                } else if (i <= indexOfMouseDownEle - 1 && i >= newIndex) {
                    var previousTranslatedY = getTransformY(childNodes[i]);

                    var translateBy = mouseDownEleBot - mouseDownEleTop + this.props.gap;


                    childNodes[i].style.transform = `translateY(${translateBy}px)`;

                    if (previousTranslatedY === 0) {
                        this.childNodesBound[i].top += translateBy;
                        this.childNodesBound[i].bottom += translateBy;
                        this.childNodesBound[i].currentlyAt += 1;
                    }
                } else {
                    var previousTranslatedY = getTransformY(childNodes[i]);
                    var translateBy = mouseDownEleBot - mouseDownEleTop + this.props.gap;

                    if (previousTranslatedY < 0) {
                        this.childNodesBound[i].top += translateBy;
                        this.childNodesBound[i].bottom += translateBy;
                        this.childNodesBound[i].currentlyAt += 1;
                    } else if (previousTranslatedY > 0) {
                        this.childNodesBound[i].top -= translateBy;
                        this.childNodesBound[i].bottom -= translateBy;
                        this.childNodesBound[i].currentlyAt -= 1;
                    }

                    childNodes[i].style.transform = "translateY(0px)";
                }
            }
            this.oldIndex = indexOfMouseDownEle;
            this.newIndex = newIndex;
        }
    };

    updateScrolling = () => {
        var triggerOffset = 40,
            offset = 0;

        var scrollable = this.context.SlippableListRef.current,
            containerRect = scrollable.getBoundingClientRect(),
            targetRect = this.mouseDownEle.getBoundingClientRect(),
            bottomOffset =
                Math.min(containerRect.bottom, window.innerHeight) - targetRect.bottom,
            topOffset = targetRect.top - Math.max(containerRect.top, 0),
            maxScrollTop =
                scrollable.scrollHeight -
                Math.min(scrollable.clientHeight, window.innerHeight);

        if (bottomOffset < triggerOffset) {
            offset = Math.min(triggerOffset, triggerOffset - bottomOffset);
        } else if (topOffset < triggerOffset) {
            offset = Math.max(-triggerOffset, topOffset - triggerOffset);
        }

        scrollable.scrollTop = Math.max(
            0,
            Math.min(maxScrollTop, scrollable.scrollTop + offset)
        );
    };

    updateSwipeElement = () => {
        this.swipingEleRef.style.transform = `translateX(${this.left}px)`;
        this.prevLeft = this.left;
    };

    updateSwipeLeftContent = () => {
        const { swipeLeftContentPercentToFullOpacity } = this.props;
        var pixelsToFullOpacity =
            (this.mouseDownEle.getBoundingClientRect().width *
                swipeLeftContentPercentToFullOpacity) /
            100;
        this.swipeLeftRef.style.opacity = -this.left / pixelsToFullOpacity;
    };

    updateSwipeRightContent = () => {
        const { swipeRightContentPercentToFullOpacity } = this.props;
        var pixelsToFullOpacity =
            (this.mouseDownEle.getBoundingClientRect().width *
                swipeRightContentPercentToFullOpacity) /
            100;
        this.swipeRightRef.style.opacity = this.left / pixelsToFullOpacity;
    };

    playReturnAnimation = () => {
        const { swipeLeftRef, swipeRightRef, swipingEleRef } = this;

        if (swipingEleRef) {
            swipingEleRef.className = "swipeable-list-item return";
            swipingEleRef.style.transform = `translateX(${(this.left = this.prevLeft = 0)})`;
        }


    };

    playRemoveAnimation = (direction) => {
        const { swipingEleRef, swipeLeftRef, swipeRightRef } = this;

        if (swipingEleRef) {
            swipingEleRef.className = "swipeable-list-item remove";
            swipingEleRef.style.transform = `translateX(${swipingEleRef.offsetWidth * (direction === "left" ? -1 : 1)
                }px)`;
        }
        if (swipeLeftRef) {
            swipeLeftRef.className = "slippable-list-item__content-swipe-left remove";
            swipeLeftRef.style.opacity = 0;
        }
        if (swipeRightRef) {
            swipeRightRef.className =
                "slippable-list-item__content-swipe-right remove";
            swipeRightRef.style.opacity = 0;
        }
    };

    playActionAnimation = (actionAnimation, direction) => {
        if (this.listItemRef) {
            switch (actionAnimation) {
                case ActionAnimations.REMOVE:
                    this.playRemoveAnimation(direction);
                    break;
                case ActionAnimations.NONE:
                    break;
                default:
                    this.playReturnAnimation();
            }
        }
    };

    handleMouseUp = (e) => {
        switch (this.dragState) {
            case "UNDECIDED":
                this.setDragState("UNDECIDED");
                this.mouseDownEle = null;
                clearTimeout(this.swipeOrReorderTimeout);
                this.removeOnMouseDownEvents();
                break;
            case "SWIPE":
                var width = this.mouseDownEle.getBoundingClientRect().width;
                var swipePercentage = this.left / width;
                if (swipePercentage >= this.props.swipeRightThreshold) {
                    this.playActionAnimation(
                        this.props.onSwipeRightEndOverThresholdAnimation,
                        "right"
                    );

                    this.props.onSwipeRightEndOverThreshold();

                    this.props.onSwipeRightEnd({
                        swipePercentage: swipePercentage,
                    });
                } else if (swipePercentage <= this.props.swipeLeftThreshold * -1) {
                    this.playActionAnimation(
                        this.props.onSwipeLeftEndOverThresholdAnimation,
                        "left"
                    );
                    this.props.onSwipeLeftEndOverThreshold();
                    this.props.onSwipeLeftEnd({ swipePercentage: swipePercentage });
                } else {
                    this.playReturnAnimation();
                    this.mouseDownEle = null;
                    if (swipePercentage < 0) {
                        this.props.onSwipeLeftEnd({
                            swipePercentage: swipePercentage,
                        });
                    } else {
                        this.props.onSwipeRightEnd({
                            swipePercentage: swipePercentage,
                        });
                    }
                }
                clearTimeout(this.swipeOrReorderTimeout);
                this.removeOnMouseDownEvents();

                break;
            case "REORDER":
                this.mouseDownEle.classList.toggle("reorder");
                this.props.onReorderEnd({
                    oldIndex: this.oldIndex,
                    newIndex: this.newIndex,
                });
                const { oldIndex, newIndex } = this;
                var childNodes = Array.from(this.mouseDownEle.parentNode.childNodes);

                Array.from(this.mouseDownEle.parentNode.childNodes)
                    .filter((e) => e !== this.mouseDownEle)
                    .forEach((e) => {
                        e.classList.toggle("transformYAnimate");
                    });

                for (var i = 0; i < childNodes.length; i++) {
                    childNodes[i].style.transform = "";
                }
                var parentNode = this.mouseDownEle.parentNode;
                var mouseDownEleNewY = 0;
                let removed = parentNode.removeChild(childNodes[oldIndex]); // remove 1 element at oldIndex
                if (newIndex == parentNode.childNodes.length) {
                    parentNode.append(removed);
                } else {
                    parentNode.insertBefore(removed, parentNode.childNodes[newIndex]);
                }

                this.mouseDownEle = null;
                this.removeOnMouseDownEvents();
                break;
            default:
                throw "SlippableListItem should either be in UNDECIDED, SWIPE, or REORDER state when mouse ups";
        }
    };

    bindlistItemRef = (ref) => (this.listItemRef = ref);
    bindSwipingEle = (ref) => (this.swipingEleRef = ref);
    bindSwipeLeftContent = (ref) => (this.swipeLeftRef = ref);
    bindSwipeRightContent = (ref) => (this.swipeRightRef = ref);

    render() {
        const { children, swipeLeftContent, swipeRightContent } = this.props;
        return (
            <div ref={this.bindlistItemRef} className="slippable-list-item">
                {swipeLeftContent && (
                    <div
                        className="slippable-list-item__content-swipe-left"
                        ref={this.bindSwipeLeftContent}
                    >
                        {swipeLeftContent}
                    </div>
                )}
                {swipeRightContent && (
                    <div
                        className="slippable-list-item__content-swipe-right"
                        ref={this.bindSwipeRightContent}
                    >
                        {swipeRightContent}
                    </div>
                )}
                <div className="swipeable-list-item" ref={this.bindSwipingEle}>
                    {children}
                </div>
            </div>
        );
    }
}

SlippableListItem.defaultProps = {
    swipeLeftContent: <div />,
    swipeRightContent: <div />,
    onSwipeLeftEnd: () => { },
    onSwipeRightEnd: () => { },
    onSwipeLeftEndOverThreshold: () => { },
    onSwipeRightEndOverThreshold: () => { },
    onSwipeRightEndOverThresholdAnimation: ActionAnimations.REMOVE,
    onSwipeLeftEndOverThresholdAnimation: ActionAnimations.REMOVE,
    swipeLeftThreshold: 0.5,
    swipeRightThreshold: 0.5,
    swipeLeftContentPercentToFullOpacity: 25,
    swipeRightContentPercentToFullOpacity: 25,
    blockSwipe: false,

    onReorderEnd: () => { },
    onReorderStart: () => { },
    gap: 0,
    blockReorder: false,
};

SlippableListItem.propTypes = {
    swipeLeftContent: PropTypes.element,
    swipeRightContent: PropTypes.element,
    onSwipeLeftEnd: PropTypes.func,
    onSwipeRightEnd: PropTypes.func,
    onSwipeLeftEndOverThreshold: PropTypes.func,
    onSwipeRightEndOverThreshold: PropTypes.func,
    onSwipeRightEndOverThresholdAnimation: PropTypes.oneOf(
        Object.values(ActionAnimations)
    ),
    onSwipeLeftEndOverThresholdAnimation: PropTypes.oneOf(
        Object.values(ActionAnimations)
    ),
    swipeLeftThreshold: PropTypes.number,
    swipeRightThreshold: PropTypes.number,
    swipeLeftContentPercentToFullOpacity: PropTypes.number,
    swipeRightContentPercentToFullOpacity: PropTypes.number,
    blockSwipe: PropTypes.bool,

    onReorderEnd: PropTypes.func,
    onReorderStart: PropTypes.func,
    gap: PropTypes.number,
    blockReorder: PropTypes.bool,

    children: PropTypes.element.isRequired,
};
SlippableListItem.contextType = Context;
