export default {
  abstract: false,
  extends: {
    path: "",
    overrideView: false,
  },
  props: {
    disable_scroll: {
      type: TYPES.Boolean,
      defaultValue: false,
      onChange: function () {
        if (this.disable_scroll) {
          this.removeResizeObserver()
          this.removeWheelAction()
          this.contentZoom.style.width = ""
          this.contentZoom.style.height = ""
        } else {
          this.addResizeObserver()
          this.addWheelAction()
        }
      },
    },
    zoom: {
      type: TYPES.Number,
      defaultValue: 1,
      onChange: function () {
        this.changeZoom()
      },
    },
    floating_scroll: {
      type: TYPES.Boolean,
    },
    only_vertical: {
      type: TYPES.Boolean,
      defaultValue: false,
    },
  },
  variables: {
    verticalScrollVisible: false,
    horizontalScrollVisible: false,
    observer: undefined,
    wheelAction: undefined,
    touchWheelAction: undefined,

    contentHidderWidth: undefined,
    contentHidderHeight: undefined,

    content: {
      vertical: {
        value: 0,
        max: 0,
      },
      horizontal: {
        value: 0,
        max: 0,
      },
    },
    scrollbar: {
      vertical: {
        value: 0,
        max: 0,
      },
      horizontal: {
        value: 0,
        max: 0,
      },
    },

    refreshTimeout: 100,
  },
  events: {
    _preventDrag(e) {
      e.preventDefault()
      return false
    },
  },
  methods: {
    getVisibleBox() {
      return {
        top: this.content.vertical.value,
        left: this.content.horizontal.value,
        width: this.contentHidder.offsetWidth,
        height: this.contentHidder.offsetHeight,
      }
    },
    changeZoom() {
      if (!this.disable_scroll) {
        this.contentZoom.style.transform = "scale(" + this.zoom + ")"
        this.dimensionRefreshed()
      }
    },
    dimensionRefreshed(entries) {
      this._calculateRealSize()
      if (this.contentWrapper.scrollHeight - this.contentHidderHeight > 2) {
        if (!this.verticalScrollVisible) {
          this.verticalScrollerContainer.style.display = "block"
          this.verticalScrollVisible = true
          this._afterShowVerticalScroller()
        }
        var verticalScrollerHeight =
          (this.contentHidderHeight / this.contentWrapper.scrollHeight) * 100
        this.verticalScroller.style.height = verticalScrollerHeight + "%"

        this.scrollVerticalScrollbar(this.scrollbar.vertical.value)
      } else if (this.verticalScrollVisible) {
        this.verticalScrollerContainer.style.display = "none"
        this.verticalScrollVisible = false
        this._afterShowVerticalScroller()
        this.scrollVerticalScrollbar(0)
      }

      if (!this.only_vertical) {
        if (this.contentWrapper.scrollWidth - this.contentHidderWidth > 2) {
          if (!this.horizontalScrollVisible) {
            this.horizontalScrollerContainer.style.display = "block"
            this.horizontalScrollVisible = true
            this._afterShowHorizontalScroller()
          }
          var horizontalScrollerWidth =
            (this.contentHidderWidth / this.contentWrapper.scrollWidth) * 100
          this.horizontalScroller.style.width = horizontalScrollerWidth + "%"

          this.scrollHorizontalScrollbar(this.scrollbar.horizontal.value)
        } else if (this.horizontalScrollVisible) {
          this.horizontalScrollerContainer.style.display = "none"
          this.horizontalScrollVisible = false
          this._afterShowHorizontalScroller()
          this.scrollHorizontalScrollbar(0)
        }
      }

      if (entries && entries[0].target == this) {
        if (this.zoom != 1) {
          this.contentZoom.style.width = ""
          this.contentZoom.style.height = ""
          this.changeZoom()
        }
      }
    },
    _calculateRealSize() {
      if (!this.disable_scroll) {
        var currentOffsetWidth = this.contentZoom.offsetWidth
        var currentOffsetHeight = this.contentZoom.offsetHeight

        this.contentHidderHeight = currentOffsetHeight // * this.zoom;
        this.contentHidderWidth = currentOffsetWidth //* this.zoom;

        if (this.zoom < 1) {
          this.contentZoom.style.width =
            this.elToCalculate.offsetWidth / this.zoom + "px"
          this.contentZoom.style.height =
            this.elToCalculate.offsetHeight / this.zoom + "px"
        } else {
          let inlineStyle = this.getAttribute("style")
          if (inlineStyle) {
            let arrStyle = inlineStyle.split(";")
            for (let i = 0; i < arrStyle.length; i++) {
              if (
                arrStyle[i].trim().startsWith("width") ||
                arrStyle[i].trim().startsWith("height")
              ) {
                this.contentZoom.style.width = ""
                this.contentZoom.style.height = ""
              }
            }
          }

          this.contentHidderHeight = currentOffsetHeight / this.zoom
          this.contentHidderWidth = currentOffsetWidth / this.zoom
        }
      }
    },
    _afterShowVerticalScroller() {
      var leftMissing =
        this.elToCalculate.offsetWidth -
        this.verticalScrollerContainer.offsetLeft
      if (
        leftMissing > 0 &&
        this.verticalScrollVisible &&
        !this.floating_scroll
      ) {
        this.contentHidder.style.width = "calc(100% - " + leftMissing + "px)"
        this.contentHidder.style.marginRight = leftMissing + "px"
      } else {
        this.contentHidder.style.width = ""
        this.contentHidder.style.marginRight = ""
      }
    },
    _afterShowHorizontalScroller() {
      var topMissing =
        this.elToCalculate.offsetHeight -
        this.horizontalScrollerContainer.offsetTop
      if (
        topMissing > 0 &&
        this.horizontalScrollVisible &&
        !this.floating_scroll
      ) {
        this.contentHidder.style.height = "calc(100% - " + topMissing + "px)"
        this.contentHidder.style.marginBottom = topMissing + "px"
      } else {
        this.contentHidder.style.height = ""
        this.contentHidder.style.marginBottom = ""
      }
    },

    createResizeObserver() {
      let inProgress = false
      this.observer = new DtResizeObserver((entries) => {
        if (inProgress) {
          return
        }
        inProgress = true
        this.dimensionRefreshed(entries)
        inProgress = false
      })
    },
    addResizeObserver() {
      if (this.observer == undefined) {
        this.createResizeObserver()
      }
      this.observer.observe(this.contentWrapper)
      this.observer.observe(this)
    },
    removeResizeObserver() {
      this.observer.unobserve(this.contentWrapper)
      this.observer.unobserve(this)
    },

    addVerticalScrollAction() {
      var diff = 0
      var oldDiff = 0
      var intervalTimer = undefined
      var intervalMove = () => {
        if (diff != oldDiff) {
          oldDiff = diff
          this.scrollVerticalScrollbar(diff)
        }
      }

      let mouseDown = (e) => {
        e.normalize()
        var startY = e.pageY
        var oldVerticalScrollPosition = this.verticalScroller.offsetTop
        this.classList.add("scrolling")
        this.verticalScroller.classList.add("active")
        intervalTimer = setInterval(intervalMove, this.refreshTimeout)

        var mouseMove = (e) => {
          e.normalize()
          diff = oldVerticalScrollPosition + e.pageY - startY
        }
        var mouseUp = (e) => {
          clearInterval(intervalTimer)
          this.scrollVerticalScrollbar(diff)
          this.classList.remove("scrolling")
          this.verticalScroller.classList.remove("active")
          document.removeEventListener("mousemove", mouseMove)
          document.removeEventListener("touchmove", mouseMove)
          document.removeEventListener("mouseup", mouseUp)
          document.removeEventListener("touchend", mouseUp)
        }

        document.addEventListener("mousemove", mouseMove)
        document.addEventListener("touchmove", mouseMove)
        document.addEventListener("mouseup", mouseUp)
        document.addEventListener("touchend", mouseUp)

        return false
      }
      this.verticalScroller.addEventListener("mousedown", mouseDown)
      this.verticalScroller.addEventListener("touchstart", mouseDown)

      this.verticalScroller.addEventListener("dragstart", this._preventDrag)
      this.verticalScroller.addEventListener("drop", this._preventDrag)
    },
    addHorizontalScrollAction() {
      var diff = 0
      var oldDiff = 0
      var intervalTimer = undefined
      var intervalMove = () => {
        if (diff != oldDiff) {
          oldDiff = diff
          this.scrollHorizontalScrollbar(diff)
        }
      }

      let mouseDown = (e) => {
        e.normalize()
        var startX = e.pageX
        var oldHoritzontalScrollPosition = this.horizontalScroller.offsetLeft
        this.classList.add("scrolling")
        this.horizontalScroller.classList.add("active")
        intervalTimer = setInterval(intervalMove, this.refreshTimeout)

        var mouseMove = (e) => {
          e.normalize()
          diff = oldHoritzontalScrollPosition + e.pageX - startX
        }
        var mouseUp = (e) => {
          clearInterval(intervalTimer)
          this.scrollHorizontalScrollbar(diff)
          this.classList.remove("scrolling")
          this.horizontalScroller.classList.remove("active")
          document.removeEventListener("mousemove", mouseMove)
          document.removeEventListener("touchmove", mouseMove)
          document.removeEventListener("mouseup", mouseUp)
          document.removeEventListener("touchend", mouseUp)
        }

        document.addEventListener("mousemove", mouseMove)
        document.addEventListener("touchmove", mouseMove)
        document.addEventListener("mouseup", mouseUp)
        document.addEventListener("touchend", mouseUp)
      }

      this.horizontalScroller.addEventListener("mousedown", mouseDown)
      this.horizontalScroller.addEventListener("touchstart", mouseDown)

      this.horizontalScroller.addEventListener("dragstart", this._preventDrag)
      this.horizontalScroller.addEventListener("drop", this._preventDrag)
    },
    createTouchWheelAction() {
      this.touchWheelAction = (e) => {
        e.normalize()
        let startX = e.pageX
        let startY = e.pageY
        let startVertical = this.scrollbar.vertical.value
        let startHorizontal = this.scrollbar.horizontal.value
        let touchMove = (e) => {
          e.normalize()
          let diffX = startX - e.pageX
          let diffY = startY - e.pageY
          this.scrollHorizontalScrollbar(startHorizontal + diffX)
          this.scrollVerticalScrollbar(startVertical + diffY)
        }
        let touchEnd = () => {
          window.removeEventListener("touchmove", touchMove)
          window.removeEventListener("touchend", touchEnd)
        }
        window.addEventListener("touchmove", touchMove)
        window.addEventListener("touchend", touchEnd)
      }
    },
    createWheelAction() {
      this.wheelAction = (e) => {
        if (e.altKey) {
          if (this.horizontalScrollVisible) {
            var scrollX = e.deltaY / 5
            this.scrollHorizontalScrollbar(
              this.scrollbar.horizontal.value + scrollX
            )
          }
        } else {
          if (this.verticalScrollVisible) {
            var scrollY = e.deltaY / 5
            this.scrollVerticalScrollbar(
              this.scrollbar.vertical.value + scrollY
            )
          }
        }
      }
    },
    addWheelAction() {
      if (!this.wheelAction) {
        this.createWheelAction()
      }
      if (!this.touchWheelAction) {
        this.createTouchWheelAction()
      }
      this.addEventListener("wheel", this.wheelAction)
      this.addEventListener("touchstart", this.touchWheelAction)
    },
    removeWheelAction() {
      if (this.wheelAction) {
        this.removeEventListener("wheel", this.wheelAction)
      }
      if (this.touchWheelAction) {
        this.removeEventListener("touchstart", this.touchWheelAction)
      }
    },
    scrollScrollbarTo(horizontalValue, verticalValue) {
      this.scrollHorizontalScrollbar(horizontalValue)
      this.scrollVerticalScrollbar(verticalValue)
    },
    scrollHorizontalScrollbar(horizontalValue) {
      if (!this.only_vertical) {
        if (horizontalValue != undefined) {
          var maxScroller =
            this.horizontalScrollerContainer.offsetWidth -
            this.horizontalScroller.offsetWidth
          this.scrollbar.horizontal.max = maxScroller
          var maxScrollContent =
            this.contentWrapper.scrollWidth - this.contentHidderWidth
          if (maxScrollContent < 0) {
            maxScrollContent = 0
          }
          this.content.horizontal.max = maxScrollContent
          if (horizontalValue < 0) {
            horizontalValue = 0
          } else if (horizontalValue > maxScroller) {
            horizontalValue = maxScroller
          }
          this.scrollbar.horizontal.value = horizontalValue
          this.horizontalScroller.style.left = horizontalValue + "px"
          if (maxScroller != 0) {
            var percent = maxScrollContent / maxScroller
            this.content.horizontal.value = Math.round(
              horizontalValue * percent
            )
          } else {
            this.content.horizontal.value = 0
          }
          this.contentWrapper.style.left =
            -1 * this.content.horizontal.value + "px"
          this._emitScroll()
        }
      }
    },
    scrollVerticalScrollbar(verticalValue) {
      if (verticalValue != undefined) {
        var maxScroller =
          this.verticalScrollerContainer.offsetHeight -
          this.verticalScroller.offsetHeight
        this.scrollbar.vertical.max = maxScroller
        var maxScrollContent =
          this.contentWrapper.scrollHeight - this.contentHidderHeight
        if (maxScrollContent < 0) {
          maxScrollContent = 0
        }
        this.content.vertical.max = maxScrollContent
        if (verticalValue < 0) {
          verticalValue = 0
        } else if (verticalValue > maxScroller) {
          verticalValue = maxScroller
        }
        this.scrollbar.vertical.value = verticalValue
        this.verticalScroller.style.top = verticalValue + "px"
        if (maxScroller != 0) {
          var percent = maxScrollContent / maxScroller
          this.content.vertical.value = Math.round(verticalValue * percent)
        } else {
          this.content.vertical.value = 0
        }
        this.contentWrapper.style.top = -1 * this.content.vertical.value + "px"
        this._emitScroll()
      }
    },
    scrollHorizontal(horizontalValue) {
      if (!this.only_vertical) {
        if (horizontalValue != undefined) {
          var maxScroller =
            this.horizontalScrollerContainer.offsetWidth -
            this.horizontalScroller.offsetWidth
          this.scrollbar.horizontal.max = maxScroller
          var maxScrollContent =
            this.contentWrapper.scrollWidth - this.contentHidderWidth
          if (maxScrollContent < 0) {
            maxScrollContent = 0
          }
          this.content.horizontal.max = maxScrollContent
          if (horizontalValue < 0) {
            horizontalValue = 0
          } else if (horizontalValue > maxScrollContent) {
            horizontalValue = maxScrollContent
          }
          this.content.horizontal.value = horizontalValue
          this.contentWrapper.style.left = -horizontalValue + "px"
          if (maxScroller != 0) {
            var percent = maxScrollContent / maxScroller
            this.scrollbar.horizontal.value = Math.round(
              horizontalValue / percent
            )
          } else {
            this.scrollbar.horizontal.value = 0
          }
          this.horizontalScroller.style.left =
            this.scrollbar.horizontal.value + "px"
          this._emitScroll()
        }
      }
    },
    scrollVertical(verticalValue) {
      if (verticalValue != undefined) {
        var maxScroller =
          this.verticalScrollerContainer.offsetHeight -
          this.verticalScroller.offsetHeight
        this.scrollbar.vertical.max = maxScroller
        var maxScrollContent =
          this.contentWrapper.scrollHeight - this.contentHidderHeight
        if (maxScrollContent < 0) {
          maxScrollContent = 0
        }
        this.content.vertical.max = maxScroller
        if (verticalValue < 0) {
          verticalValue = 0
        } else if (verticalValue > maxScrollContent) {
          verticalValue = maxScrollContent
        }
        this.content.vertical.value = verticalValue
        this.verticalScroller.style.top = -verticalValue + "px"
        if (maxScroller != 0) {
          var percent = maxScrollContent / maxScroller
          this.scrollbar.vertical.value = Math.round(verticalValue / percent)
        } else {
          this.scrollbar.vertical.value = 0
        }
        this.verticalScroller.style.top = this.scrollbar.vertical.value + "px"
        this.contentWrapper.style.top = -1 * this.content.vertical.value + "px"
        this._emitScroll()
      }
    },
    scrollTo(horizontalValue, verticalValue) {
      this.scrollHorizontal(horizontalValue)
      this.scrollVertical(verticalValue)
    },
    _emitScroll() {
      var customEvent = new CustomEvent("scroll")
      this.dispatchEvent(customEvent)
    },
  },
  static: {},
  _postCreation() {
    if (!this.disable_scroll) {
      this.addResizeObserver()

      this.addWheelAction()
    }
    this.addVerticalScrollAction()
    this.addHorizontalScrollAction()
    this.contentHidder.addEventListener("scroll", () => {
      if (this.contentHidder.scrollTop != 0) {
        this.contentHidder.scrollTop = 0
      }
    })
  },
}
