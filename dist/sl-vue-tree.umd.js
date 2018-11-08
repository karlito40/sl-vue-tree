(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global.SlVueTree = factory());
}(this, (function () { 'use strict';

  var script = {
    name: 'sl-vue-tree',
    props: {
      value: {
        type: Array,
        default: function _default() {
          return [];
        }
      },
      edgeSize: {
        type: Number,
        default: 3
      },
      showBranches: {
        type: Boolean,
        default: false
      },
      level: {
        type: Number,
        default: 0
      },
      parentInd: {
        type: Number
      },
      allowMultiselect: {
        type: Boolean,
        default: true
      },
      multiselectKey: {
        type: [String, Array],
        default: function _default() {
          return ['ctrlKey', 'metaKey'];
        },
        validator: function validator(value) {
          var allowedKeys = ['ctrlKey', 'metaKey', 'altKey'];
          var multiselectKeys = Array.isArray(value) ? value : [value];
          multiselectKeys = multiselectKeys.filter(function (keyName) {
            return allowedKeys.indexOf(keyName) !== -1;
          });
          return !!multiselectKeys.length;
        }
      },
      scrollAreaHeight: {
        type: Number,
        default: 70
      },
      maxScrollSpeed: {
        type: Number,
        default: 20
      }
    },
    data: function data() {
      return {
        rootCursorPosition: null,
        scrollIntervalId: 0,
        scrollSpeed: 0,
        lastSelectedNode: null,
        mouseIsDown: false,
        isDragging: false,
        lastMousePos: {
          x: 0,
          y: 0
        },
        preventDrag: false,
        currentValue: this.value
      };
    },
    mounted: function mounted() {
      if (this.isRoot) {
        document.addEventListener('mouseup', this.onDocumentMouseupHandler);
      }
    },
    beforeDestroy: function beforeDestroy() {
      document.removeEventListener('mouseup', this.onDocumentMouseupHandler);
    },
    watch: {
      value: function value(newValue) {
        this.currentValue = newValue;
      }
    },
    computed: {
      cursorPosition: function cursorPosition() {
        if (this.isRoot) return this.rootCursorPosition;
        return this.getParent().cursorPosition;
      },
      nodes: function nodes() {
        if (this.isRoot) {
          var nodeModels = this.copy(this.currentValue);
          return this.getNodes(nodeModels);
        }

        return this.getParent().nodes[this.parentInd].children;
      },

      /**
      * gaps is using for nodes indentation
      * @returns {number[]}
      */
      gaps: function gaps() {
        var gaps = [];
        var i = this.level - 1;
        if (!this.showBranches) i++;

        while (i-- > 0) {
          gaps.push(i);
        }

        return gaps;
      },
      isRoot: function isRoot() {
        return !this.level;
      },
      selectionSize: function selectionSize() {
        return this.getSelected().length;
      },
      dragSize: function dragSize() {
        return this.getDraggable().length;
      }
    },
    methods: {
      setCursorPosition: function setCursorPosition(pos) {
        if (this.isRoot) {
          this.rootCursorPosition = pos;
          return;
        }

        this.getParent().setCursorPosition(pos);
      },
      getNodes: function getNodes(nodeModels) {
        var _this = this;

        var parentPath = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
        var isVisible = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : true;
        return nodeModels.map(function (nodeModel, ind) {
          var nodePath = parentPath.concat(ind);
          return _this.getNode(nodePath, nodeModel, nodeModels, isVisible);
        });
      },
      getNode: function getNode(path) {
        var nodeModel = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
        var siblings = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;
        var isVisible = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : null;
        var ind = path.slice(-1)[0]; // calculate nodeModel, siblings, isVisible fields if it is not passed as arguments

        siblings = siblings || this.getNodeSiblings(this.currentValue, path);
        nodeModel = nodeModel || siblings && siblings[ind] || null;

        if (isVisible == null) {
          isVisible = this.isVisible(path);
        }

        if (!nodeModel) return null;
        var isExpanded = nodeModel.isExpanded == void 0 ? true : !!nodeModel.isExpanded;
        var isDraggable = nodeModel.isDraggable == void 0 ? true : !!nodeModel.isDraggable;
        var isSelectable = nodeModel.isSelectable == void 0 ? true : !!nodeModel.isSelectable;
        var node = {
          // define the all ISlTreeNodeModel props
          title: nodeModel.title,
          isLeaf: !!nodeModel.isLeaf,
          children: nodeModel.children ? this.getNodes(nodeModel.children, path, isExpanded) : [],
          isSelected: !!nodeModel.isSelected,
          isExpanded: isExpanded,
          isVisible: isVisible,
          isDraggable: isDraggable,
          isSelectable: isSelectable,
          data: nodeModel.data !== void 0 ? nodeModel.data : {},
          // define the all ISlTreeNode computed props
          path: path,
          pathStr: JSON.stringify(path),
          level: path.length,
          ind: ind,
          isFirstChild: ind == 0,
          isLastChild: ind === siblings.length - 1
        };
        return node;
      },
      isVisible: function isVisible(path) {
        if (path.length < 2) return true;
        var nodeModels = this.currentValue;

        for (var i = 0; i < path.length - 1; i++) {
          var ind = path[i];
          var nodeModel = nodeModels[ind];
          var isExpanded = nodeModel.isExpanded == void 0 ? true : !!nodeModel.isExpanded;
          if (!isExpanded) return false;
          nodeModels = nodeModel.children;
        }

        return true;
      },
      emitInput: function emitInput(newValue) {
        this.currentValue = newValue;
        this.getRoot().$emit('input', newValue);
      },
      emitSelect: function emitSelect(selectedNodes, event) {
        this.getRoot().$emit('select', selectedNodes, event);
      },
      emitBeforeDrop: function emitBeforeDrop(draggingNodes, position, cancel) {
        this.getRoot().$emit('beforedrop', draggingNodes, position, cancel);
      },
      emitDrop: function emitDrop(draggingNodes, position, event) {
        this.getRoot().$emit('drop', draggingNodes, position, event);
      },
      emitToggle: function emitToggle(toggledNode, event) {
        this.getRoot().$emit('toggle', toggledNode, event);
      },
      emitNodeClick: function emitNodeClick(node, event) {
        this.getRoot().$emit('nodeclick', node, event);
      },
      emitNodeDblclick: function emitNodeDblclick(node, event) {
        this.getRoot().$emit('nodedblclick', node, event);
      },
      emitNodeContextmenu: function emitNodeContextmenu(node, event) {
        this.getRoot().$emit('nodecontextmenu', node, event);
      },
      emitNodeEnter: function emitNodeEnter(node, event) {
        this.getRoot().$emit('nodeenter', node, event);
      },
      emitNodeLeave: function emitNodeLeave(node, event) {
        this.getRoot().$emit('nodeleave', node, event);
      },
      emitNodeOver: function emitNodeOver(node, event) {
        this.getRoot().$emit('nodeover', node, event);
      },
      emitNodeOut: function emitNodeOut(node, event) {
        this.getRoot().$emit('nodeout', node, event);
      },
      onExternalDragoverHandler: function onExternalDragoverHandler(node, event) {
        event.preventDefault();
        var root = this.getRoot();
        var cursorPosition = root.getCursorPositionFromCoords(event.clientX, event.clientY);
        root.setCursorPosition(cursorPosition);
        root.$emit('externaldragover', cursorPosition, event);
      },
      onExternalDropHandler: function onExternalDropHandler(node, event) {
        var root = this.getRoot();
        var cursorPosition = root.getCursorPositionFromCoords(event.clientX, event.clientY);
        root.$emit('externaldrop', cursorPosition, event);
        this.setCursorPosition(null);
      },
      select: function select(path) {
        var _this2 = this;

        var addToSelection = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
        var event = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;
        var multiselectKeys = Array.isArray(this.multiselectKey) ? this.multiselectKey : [this.multiselectKey];
        var multiselectKeyIsPressed = event && !!multiselectKeys.find(function (key) {
          return event[key];
        });
        addToSelection = (multiselectKeyIsPressed || addToSelection) && this.allowMultiselect;
        var selectedNode = this.getNode(path);
        if (!selectedNode) return null;
        var newNodes = this.copy(this.currentValue);
        var shiftSelectionMode = this.allowMultiselect && event && event.shiftKey && this.lastSelectedNode;
        var selectedNodes = [];
        var shiftSelectionStarted = false;
        this.traverse(function (node, nodeModel) {
          if (shiftSelectionMode) {
            if (node.pathStr === selectedNode.pathStr || node.pathStr === _this2.lastSelectedNode.pathStr) {
              nodeModel.isSelected = node.isSelectable;
              shiftSelectionStarted = !shiftSelectionStarted;
            }

            if (shiftSelectionStarted) nodeModel.isSelected = node.isSelectable;
          } else if (node.pathStr === selectedNode.pathStr) {
            nodeModel.isSelected = node.isSelectable;
          } else if (!addToSelection) {
            if (nodeModel.isSelected) nodeModel.isSelected = false;
          }

          if (nodeModel.isSelected) selectedNodes.push(node);
        }, newNodes);
        this.lastSelectedNode = selectedNode;
        this.emitInput(newNodes);
        this.emitSelect(selectedNodes, event);
        return selectedNode;
      },
      onMousemoveHandler: function onMousemoveHandler(event) {
        if (!this.isRoot) {
          this.getRoot().onMousemoveHandler(event);
          return;
        }

        if (this.preventDrag) return;
        var initialDraggingState = this.isDragging;
        var isDragging = this.isDragging || this.mouseIsDown && (this.lastMousePos.x !== event.clientX || this.lastMousePos.y !== event.clientY);
        var isDragStarted = initialDraggingState === false && isDragging === true;
        this.lastMousePos = {
          x: event.clientX,
          y: event.clientY
        };
        if (!isDragging) return;
        var $root = this.getRoot().$el;
        var rootRect = $root.getBoundingClientRect();
        var $dragInfo = this.$refs.dragInfo;
        var dragInfoTop = event.clientY - rootRect.top + $root.scrollTop - ($dragInfo.style.marginBottom | 0);
        var dragInfoLeft = event.clientX - rootRect.left;
        $dragInfo.style.top = dragInfoTop + 'px';
        $dragInfo.style.left = dragInfoLeft + 'px';
        var cursorPosition = this.getCursorPositionFromCoords(event.clientX, event.clientY);
        var destNode = cursorPosition.node;
        var placement = cursorPosition.placement;

        if (isDragStarted && !destNode.isSelected) {
          this.select(destNode.path, false, event);
        }

        var draggableNodes = this.getDraggable();

        if (!draggableNodes.length) {
          this.preventDrag = true;
          return;
        }

        this.isDragging = isDragging;
        this.setCursorPosition({
          node: destNode,
          placement: placement
        });
        var scrollBottomLine = rootRect.bottom - this.scrollAreaHeight;
        var scrollDownSpeed = (event.clientY - scrollBottomLine) / (rootRect.bottom - scrollBottomLine);
        var scrollTopLine = rootRect.top + this.scrollAreaHeight;
        var scrollTopSpeed = (scrollTopLine - event.clientY) / (scrollTopLine - rootRect.top);

        if (scrollDownSpeed > 0) {
          this.startScroll(scrollDownSpeed);
        } else if (scrollTopSpeed > 0) {
          this.startScroll(-scrollTopSpeed);
        } else {
          this.stopScroll();
        }
      },
      getCursorPositionFromCoords: function getCursorPositionFromCoords(x, y) {
        var $target = document.elementFromPoint(x, y);
        var $nodeItem = $target.getAttribute('path') ? $target : this.getClosetElementWithPath($target);
        var destNode;
        var placement;

        if ($nodeItem) {
          if (!$nodeItem) return;
          destNode = this.getNode(JSON.parse($nodeItem.getAttribute('path')));
          var nodeHeight = $nodeItem.offsetHeight;
          var edgeSize = this.edgeSize;
          var offsetY = y - $nodeItem.getBoundingClientRect().top;

          if (destNode.isLeaf) {
            placement = offsetY >= nodeHeight / 2 ? 'after' : 'before';
          } else {
            if (offsetY <= edgeSize) {
              placement = 'before';
            } else if (offsetY >= nodeHeight - edgeSize) {
              placement = 'after';
            } else {
              placement = 'inside';
            }
          }
        } else {
          var $root = this.getRoot().$el;
          var rootRect = $root.getBoundingClientRect();

          if (y > rootRect.top + rootRect.height / 2) {
            placement = 'after';
            destNode = this.getLastNode();
          } else {
            placement = 'before';
            destNode = this.getFirstNode();
          }
        }

        return {
          node: destNode,
          placement: placement
        };
      },
      getClosetElementWithPath: function getClosetElementWithPath($el) {
        if (!$el) return null;
        if ($el.getAttribute('path')) return $el;
        return this.getClosetElementWithPath($el.parentElement);
      },
      onMouseleaveHandler: function onMouseleaveHandler(event) {
        if (!this.isRoot || !this.isDragging) return;
        var $root = this.getRoot().$el;
        var rootRect = $root.getBoundingClientRect();

        if (event.clientY >= rootRect.bottom) {
          this.setCursorPosition({
            node: this.nodes.slice(-1)[0],
            placement: 'after'
          });
        } else if (event.clientY < rootRect.top) {
          this.setCursorPosition({
            node: this.getFirstNode(),
            placement: 'before'
          });
        }
      },
      getNodeEl: function getNodeEl(path) {
        this.getRoot().$el.querySelector("[path=\"".concat(JSON.stringify(path), "\"]"));
      },
      getLastNode: function getLastNode() {
        var lastNode = null;
        this.traverse(function (node) {
          lastNode = node;
        });
        return lastNode;
      },
      getFirstNode: function getFirstNode() {
        return this.getNode([0]);
      },
      getNextNode: function getNextNode(path) {
        var _this3 = this;

        var filter = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
        var resultNode = null;
        this.traverse(function (node) {
          if (_this3.comparePaths(node.path, path) < 1) return;

          if (!filter || filter(node)) {
            resultNode = node;
            return false; // stop traverse
          }
        });
        return resultNode;
      },
      getPrevNode: function getPrevNode(path, filter) {
        var _this4 = this;

        var prevNodes = [];
        this.traverse(function (node) {
          if (_this4.comparePaths(node.path, path) >= 0) {
            return false;
          }

          prevNodes.push(node);
        });
        var i = prevNodes.length;

        while (i--) {
          var node = prevNodes[i];
          if (!filter || filter(node)) return node;
        }

        return null;
      },

      /**
       * returns 1 if path1 > path2
       * returns -1 if path1 < path2
       * returns 0 if path1 == path2
       *
       * examples
       *
       * [1, 2, 3] < [1, 2, 4]
       * [1, 1, 3] < [1, 2, 3]
       * [1, 2, 3] > [1, 2, 0]
       * [1, 2, 3] > [1, 1, 3]
       * [1, 2] < [1, 2, 0]
       *
       */
      comparePaths: function comparePaths(path1, path2) {
        for (var i = 0; i < path1.length; i++) {
          if (path2[i] == void 0) return 1;
          if (path1[i] > path2[i]) return 1;
          if (path1[i] < path2[i]) return -1;
        }

        return path2[path1.length] == void 0 ? 0 : -1;
      },
      onNodeMousedownHandler: function onNodeMousedownHandler(event, node) {
        // handle only left mouse button
        if (event.button !== 0) return;

        if (!this.isRoot) {
          this.getRoot().onNodeMousedownHandler(event, node);
          return;
        }

        this.mouseIsDown = true;
      },
      startScroll: function startScroll(speed) {
        var _this5 = this;

        var $root = this.getRoot().$el;

        if (this.scrollSpeed === speed) {
          return;
        } else if (this.scrollIntervalId) {
          this.stopScroll();
        }

        this.scrollSpeed = speed;
        this.scrollIntervalId = setInterval(function () {
          $root.scrollTop += _this5.maxScrollSpeed * speed;
        }, 20);
      },
      stopScroll: function stopScroll() {
        clearInterval(this.scrollIntervalId);
        this.scrollIntervalId = 0;
        this.scrollSpeed = 0;
      },
      onDocumentMouseupHandler: function onDocumentMouseupHandler(event) {
        if (this.isDragging) this.onNodeMouseupHandler(event);
      },
      onNodeMouseupHandler: function onNodeMouseupHandler(event) {
        var targetNode = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
        // handle only left mouse button
        if (event.button !== 0) return;

        if (!this.isRoot) {
          this.getRoot().onNodeMouseupHandler(event, targetNode);
          return;
        }

        this.mouseIsDown = false;

        if (!this.isDragging && targetNode && !this.preventDrag) {
          this.select(targetNode.path, false, event);
        }

        this.preventDrag = false;

        if (!this.cursorPosition) {
          this.stopDrag();
          return;
        }

        var draggingNodes = this.getDraggable(); // check that nodes is possible to insert

        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
          for (var _iterator = draggingNodes[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var draggingNode = _step.value;

            if (draggingNode.pathStr == this.cursorPosition.node.pathStr) {
              this.stopDrag();
              return;
            }

            if (this.checkNodeIsParent(draggingNode, this.cursorPosition.node)) {
              this.stopDrag();
              return;
            }
          }
        } catch (err) {
          _didIteratorError = true;
          _iteratorError = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion && _iterator.return != null) {
              _iterator.return();
            }
          } finally {
            if (_didIteratorError) {
              throw _iteratorError;
            }
          }
        }

        var newNodes = this.copy(this.currentValue);
        var nodeModelsSubjectToInsert = []; // find dragging model to delete

        var _iteratorNormalCompletion2 = true;
        var _didIteratorError2 = false;
        var _iteratorError2 = undefined;

        try {
          for (var _iterator2 = draggingNodes[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
            var _draggingNode = _step2.value;
            var sourceSiblings = this.getNodeSiblings(newNodes, _draggingNode.path);
            var draggingNodeModel = sourceSiblings[_draggingNode.ind];
            nodeModelsSubjectToInsert.push(draggingNodeModel);
          } // allow the drop to be cancelled

        } catch (err) {
          _didIteratorError2 = true;
          _iteratorError2 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion2 && _iterator2.return != null) {
              _iterator2.return();
            }
          } finally {
            if (_didIteratorError2) {
              throw _iteratorError2;
            }
          }
        }

        var cancelled = false;
        this.emitBeforeDrop(draggingNodes, this.cursorPosition, function () {
          return cancelled = true;
        });

        if (cancelled) {
          this.stopDrag();
          return;
        }

        var nodeModelsToInsert = []; // mark dragging model to delete

        for (var _i = 0; _i < nodeModelsSubjectToInsert.length; _i++) {
          var _draggingNodeModel = nodeModelsSubjectToInsert[_i];
          nodeModelsToInsert.push(this.copy(_draggingNodeModel));
          _draggingNodeModel['_markToDelete'] = true;
        } // insert dragging nodes to the new place


        var destNode = this.cursorPosition.node;
        var destSiblings = this.getNodeSiblings(newNodes, destNode.path);
        var destNodeModel = destSiblings[destNode.ind];

        if (this.cursorPosition.placement === 'inside') {
          var _destNodeModel$childr;

          destNodeModel.children = destNodeModel.children || [];

          (_destNodeModel$childr = destNodeModel.children).unshift.apply(_destNodeModel$childr, nodeModelsToInsert);
        } else {
          var insertInd = this.cursorPosition.placement === 'before' ? destNode.ind : destNode.ind + 1;
          destSiblings.splice.apply(destSiblings, [insertInd, 0].concat(nodeModelsToInsert));
        } // delete dragging node from the old place


        this.traverseModels(function (nodeModel, siblings, ind) {
          if (!nodeModel._markToDelete) return;
          siblings.splice(ind, 1);
        }, newNodes);
        this.lastSelectedNode = null;
        this.emitInput(newNodes);
        this.emitDrop(draggingNodes, this.cursorPosition, event);
        this.stopDrag();
      },
      onToggleHandler: function onToggleHandler(event, node) {
        this.updateNode(node.path, {
          isExpanded: !node.isExpanded
        });
        this.emitToggle(node, event);
        event.stopPropagation();
      },
      stopDrag: function stopDrag() {
        this.isDragging = false;
        this.mouseIsDown = false;
        this.setCursorPosition(null);
        this.stopScroll();
      },
      getParent: function getParent() {
        return this.$parent;
      },
      getRoot: function getRoot() {
        if (this.isRoot) return this;
        return this.getParent().getRoot();
      },
      getNodeSiblings: function getNodeSiblings(nodes, path) {
        if (path.length === 1) return nodes;
        return this.getNodeSiblings(nodes[path[0]].children, path.slice(1));
      },
      getNodeModel: function getNodeModel(path) {
        var nodeModels = this.currentValue;
        var nodeModel;
        var _iteratorNormalCompletion3 = true;
        var _didIteratorError3 = false;
        var _iteratorError3 = undefined;

        try {
          for (var _iterator3 = path[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
            var nodeIndex = _step3.value;
            nodeModel = nodeModels[nodeIndex];
            nodeModels = nodeModel.children || [];
          }
        } catch (err) {
          _didIteratorError3 = true;
          _iteratorError3 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion3 && _iterator3.return != null) {
              _iterator3.return();
            }
          } finally {
            if (_didIteratorError3) {
              throw _iteratorError3;
            }
          }
        }

        return nodeModel;
      },
      updateNode: function updateNode(path, patch) {
        if (!this.isRoot) {
          this.getParent().updateNode(path, patch);
          return;
        }

        var pathStr = JSON.stringify(path);
        var newNodes = this.copy(this.currentValue);
        this.traverse(function (node, nodeModel) {
          if (node.pathStr !== pathStr) return;
          Object.assign(nodeModel, patch);
        }, newNodes);
        this.emitInput(newNodes);
      },
      getSelected: function getSelected() {
        var selectedNodes = [];
        this.traverse(function (node) {
          if (node.isSelected) selectedNodes.push(node);
        });
        return selectedNodes;
      },
      getDraggable: function getDraggable() {
        var selectedNodes = [];
        this.traverse(function (node) {
          if (node.isSelected && node.isDraggable) selectedNodes.push(node);
        });
        return selectedNodes;
      },
      traverse: function traverse(cb) {
        var nodeModels = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
        var parentPath = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [];
        if (!nodeModels) nodeModels = this.currentValue;
        var shouldStop = false;
        var nodes = [];

        for (var nodeInd = 0; nodeInd < nodeModels.length; nodeInd++) {
          var nodeModel = nodeModels[nodeInd];
          var itemPath = parentPath.concat(nodeInd);
          var node = this.getNode(itemPath, nodeModel, nodeModels);
          shouldStop = cb(node, nodeModel, nodeModels) === false;
          nodes.push(node);
          if (shouldStop) break;

          if (nodeModel.children) {
            shouldStop = this.traverse(cb, nodeModel.children, itemPath) === false;
            if (shouldStop) break;
          }
        }

        return !shouldStop ? nodes : false;
      },
      traverseModels: function traverseModels(cb, nodeModels) {
        var i = nodeModels.length;

        while (i--) {
          var nodeModel = nodeModels[i];
          if (nodeModel.children) this.traverseModels(cb, nodeModel.children);
          cb(nodeModel, nodeModels, i);
        }

        return nodeModels;
      },
      remove: function remove(paths) {
        var pathsStr = paths.map(function (path) {
          return JSON.stringify(path);
        });
        var newNodes = this.copy(this.currentValue);
        this.traverse(function (node, nodeModel, siblings) {
          var _iteratorNormalCompletion4 = true;
          var _didIteratorError4 = false;
          var _iteratorError4 = undefined;

          try {
            for (var _iterator4 = pathsStr[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
              var pathStr = _step4.value;
              if (node.pathStr === pathStr) nodeModel._markToDelete = true;
            }
          } catch (err) {
            _didIteratorError4 = true;
            _iteratorError4 = err;
          } finally {
            try {
              if (!_iteratorNormalCompletion4 && _iterator4.return != null) {
                _iterator4.return();
              }
            } finally {
              if (_didIteratorError4) {
                throw _iteratorError4;
              }
            }
          }
        }, newNodes);
        this.traverseModels(function (nodeModel, siblings, ind) {
          if (!nodeModel._markToDelete) return;
          siblings.splice(ind, 1);
        }, newNodes);
        this.emitInput(newNodes);
      },
      checkNodeIsParent: function checkNodeIsParent(sourceNode, destNode) {
        var destPath = destNode.path;
        return JSON.stringify(destPath.slice(0, sourceNode.path.length)) == sourceNode.pathStr;
      },
      copy: function copy(entity) {
        return JSON.parse(JSON.stringify(entity));
      }
    }
  };

  /* script */
              const __vue_script__ = script;
              
  /* template */
  var __vue_render__ = function() {
    var _vm = this;
    var _h = _vm.$createElement;
    var _c = _vm._self._c || _h;
    return _c(
      "div",
      {
        staticClass: "sl-vue-tree",
        class: { "sl-vue-tree-root": _vm.isRoot },
        on: {
          mousemove: _vm.onMousemoveHandler,
          mouseleave: _vm.onMouseleaveHandler,
          dragend: function($event) {
            _vm.onDragendHandler(null, $event);
          }
        }
      },
      [
        _c(
          "div",
          { ref: "nodes", staticClass: "sl-vue-tree-nodes-list" },
          [
            _vm._l(_vm.nodes, function(node, nodeInd) {
              return _c(
                "div",
                {
                  staticClass: "sl-vue-tree-node",
                  class: { "sl-vue-tree-selected": node.isSelected }
                },
                [
                  _c("div", {
                    staticClass: "sl-vue-tree-cursor sl-vue-tree-cursor_before",
                    style: {
                      visibility:
                        _vm.cursorPosition &&
                        _vm.cursorPosition.node.pathStr === node.pathStr &&
                        _vm.cursorPosition.placement === "before"
                          ? "visible"
                          : "hidden"
                    },
                    on: {
                      dragover: function($event) {
                        $event.preventDefault();
                      }
                    }
                  }),
                  _vm._v(" "),
                  _c(
                    "div",
                    {
                      staticClass: "sl-vue-tree-node-item",
                      class: {
                        "sl-vue-tree-cursor-hover":
                          _vm.cursorPosition &&
                          _vm.cursorPosition.node.pathStr === node.pathStr,

                        "sl-vue-tree-cursor-inside":
                          _vm.cursorPosition &&
                          _vm.cursorPosition.placement === "inside" &&
                          _vm.cursorPosition.node.pathStr === node.pathStr,
                        "sl-vue-tree-node-is-leaf": node.isLeaf,
                        "sl-vue-tree-node-is-folder": !node.isLeaf
                      },
                      attrs: { path: node.pathStr },
                      on: {
                        mouseenter: function($event) {
                          _vm.emitNodeEnter(node, $event);
                        },
                        mouseleave: function($event) {
                          _vm.emitNodeLeave(node, $event);
                        },
                        mouseover: function($event) {
                          _vm.emitNodeOver(node, $event);
                        },
                        mouseout: function($event) {
                          _vm.emitNodeOut(node, $event);
                        },
                        mousedown: function($event) {
                          _vm.onNodeMousedownHandler($event, node);
                        },
                        mouseup: function($event) {
                          _vm.onNodeMouseupHandler($event, node);
                        },
                        contextmenu: function($event) {
                          _vm.emitNodeContextmenu(node, $event);
                        },
                        dblclick: function($event) {
                          _vm.emitNodeDblclick(node, $event);
                        },
                        click: function($event) {
                          _vm.emitNodeClick(node, $event);
                        },
                        dragover: function($event) {
                          _vm.onExternalDragoverHandler(node, $event);
                        },
                        drop: function($event) {
                          _vm.onExternalDropHandler(node, $event);
                        }
                      }
                    },
                    [
                      _vm._l(_vm.gaps, function(gapInd) {
                        return _c("div", { staticClass: "sl-vue-tree-gap" })
                      }),
                      _vm._v(" "),
                      _vm.level && _vm.showBranches
                        ? _c(
                            "div",
                            { staticClass: "sl-vue-tree-branch" },
                            [
                              _vm._t(
                                "branch",
                                [
                                  !node.isLastChild
                                    ? _c("span", [
                                        _vm._v(
                                          "\n            " +
                                            _vm._s(String.fromCharCode(0x251c)) +
                                            _vm._s(String.fromCharCode(0x2500)) +
                                            " \n          "
                                        )
                                      ])
                                    : _vm._e(),
                                  _vm._v(" "),
                                  node.isLastChild
                                    ? _c("span", [
                                        _vm._v(
                                          "\n            " +
                                            _vm._s(String.fromCharCode(0x2514)) +
                                            _vm._s(String.fromCharCode(0x2500)) +
                                            " \n          "
                                        )
                                      ])
                                    : _vm._e()
                                ],
                                { node: node }
                              )
                            ],
                            2
                          )
                        : _vm._e(),
                      _vm._v(" "),
                      _c(
                        "div",
                        { staticClass: "sl-vue-tree-title" },
                        [
                          !node.isLeaf
                            ? _c(
                                "span",
                                {
                                  staticClass: "sl-vue-tree-toggle",
                                  on: {
                                    click: function($event) {
                                      _vm.onToggleHandler($event, node);
                                    }
                                  }
                                },
                                [
                                  _vm._t(
                                    "toggle",
                                    [
                                      _c("span", [
                                        _vm._v(
                                          "\n             " +
                                            _vm._s(
                                              !node.isLeaf
                                                ? node.isExpanded
                                                  ? "-"
                                                  : "+"
                                                : ""
                                            ) +
                                            "\n            "
                                        )
                                      ])
                                    ],
                                    { node: node }
                                  )
                                ],
                                2
                              )
                            : _vm._e(),
                          _vm._v(" "),
                          _vm._t("title", [_vm._v(_vm._s(node.title))], {
                            node: node
                          }),
                          _vm._v(" "),
                          !node.isLeaf &&
                          node.children.length == 0 &&
                          node.isExpanded
                            ? _vm._t("empty-node", null, { node: node })
                            : _vm._e()
                        ],
                        2
                      ),
                      _vm._v(" "),
                      _c(
                        "div",
                        { staticClass: "sl-vue-tree-sidebar" },
                        [_vm._t("sidebar", null, { node: node })],
                        2
                      )
                    ],
                    2
                  ),
                  _vm._v(" "),
                  node.children && node.children.length && node.isExpanded
                    ? _c("sl-vue-tree", {
                        attrs: {
                          value: node.children,
                          level: node.level,
                          parentInd: nodeInd,
                          allowMultiselect: _vm.allowMultiselect,
                          edgeSize: _vm.edgeSize,
                          showBranches: _vm.showBranches
                        },
                        on: {
                          dragover: function($event) {
                            $event.preventDefault();
                          }
                        },
                        scopedSlots: _vm._u([
                          {
                            key: "title",
                            fn: function(ref) {
                              var node = ref.node;
                              return [
                                _vm._t("title", [_vm._v(_vm._s(node.title))], {
                                  node: node
                                })
                              ]
                            }
                          },
                          {
                            key: "toggle",
                            fn: function(ref) {
                              var node = ref.node;
                              return [
                                _vm._t(
                                  "toggle",
                                  [
                                    _c("span", [
                                      _vm._v(
                                        "\n             " +
                                          _vm._s(
                                            !node.isLeaf
                                              ? node.isExpanded
                                                ? "-"
                                                : "+"
                                              : ""
                                          ) +
                                          "\n          "
                                      )
                                    ])
                                  ],
                                  { node: node }
                                )
                              ]
                            }
                          },
                          {
                            key: "sidebar",
                            fn: function(ref) {
                              var node = ref.node;
                              return [_vm._t("sidebar", null, { node: node })]
                            }
                          },
                          {
                            key: "empty-node",
                            fn: function(ref) {
                              var node = ref.node;
                              return [
                                !node.isLeaf &&
                                node.children.length == 0 &&
                                node.isExpanded
                                  ? _vm._t("empty-node", null, { node: node })
                                  : _vm._e()
                              ]
                            }
                          }
                        ])
                      })
                    : _vm._e(),
                  _vm._v(" "),
                  _c("div", {
                    staticClass: "sl-vue-tree-cursor sl-vue-tree-cursor_after",
                    style: {
                      visibility:
                        _vm.cursorPosition &&
                        _vm.cursorPosition.node.pathStr === node.pathStr &&
                        _vm.cursorPosition.placement === "after"
                          ? "visible"
                          : "hidden"
                    },
                    on: {
                      dragover: function($event) {
                        $event.preventDefault();
                      }
                    }
                  })
                ],
                1
              )
            }),
            _vm._v(" "),
            _vm.isRoot
              ? _c(
                  "div",
                  {
                    directives: [
                      {
                        name: "show",
                        rawName: "v-show",
                        value: _vm.isDragging,
                        expression: "isDragging"
                      }
                    ],
                    ref: "dragInfo",
                    staticClass: "sl-vue-tree-drag-info"
                  },
                  [
                    _vm._t("draginfo", [
                      _vm._v(
                        "\n        Items: " +
                          _vm._s(_vm.selectionSize) +
                          "\n      "
                      )
                    ])
                  ],
                  2
                )
              : _vm._e()
          ],
          2
        )
      ]
    )
  };
  var __vue_staticRenderFns__ = [];
  __vue_render__._withStripped = true;

    /* style */
    const __vue_inject_styles__ = undefined;
    /* scoped */
    const __vue_scope_id__ = undefined;
    /* module identifier */
    const __vue_module_identifier__ = undefined;
    /* functional template */
    const __vue_is_functional_template__ = false;
    /* component normalizer */
    function __vue_normalize__(
      template, style, script$$1,
      scope, functional, moduleIdentifier,
      createInjector, createInjectorSSR
    ) {
      const component = (typeof script$$1 === 'function' ? script$$1.options : script$$1) || {};

      // For security concerns, we use only base name in production mode.
      component.__file = "/Users/martin/batcave/sl-vue-tree/src/sl-vue-tree.vue";

      if (!component.render) {
        component.render = template.render;
        component.staticRenderFns = template.staticRenderFns;
        component._compiled = true;

        if (functional) component.functional = true;
      }

      component._scopeId = scope;

      return component
    }
    /* style inject */
    
    /* style inject SSR */
    

    
    var slVueTree = __vue_normalize__(
      { render: __vue_render__, staticRenderFns: __vue_staticRenderFns__ },
      __vue_inject_styles__,
      __vue_script__,
      __vue_scope_id__,
      __vue_is_functional_template__,
      __vue_module_identifier__,
      undefined,
      undefined
    );

  return slVueTree;

})));
