
import os

file_path = '/Users/bing/Downloads/e·-nexus---unified-creative-studio (9)/components/canvas/index.tsx'

with open(file_path, 'r') as f:
    lines = f.readlines()

# Indentation (6 spaces)
indent = "      "

new_code = [
    indent + "const handleNativeTouchMove = (e: TouchEvent) => {\n",
    indent + "    if (e.cancelable) e.preventDefault(); // STOP BROWSER ZOOM\n",
    "\n",
    indent + "    // --------------------------------------------------------\n",
    indent + "    // PRIORITY 1: TWO FINGERS -> ALWAYS ZOOM/PAN\n",
    indent + "    // --------------------------------------------------------\n",
    indent + "    if (e.touches.length === 2) {\n",
    indent + "        const t1 = e.touches[0];\n",
    indent + "        const t2 = e.touches[1];\n",
    indent + "        const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);\n",
    indent + "        const cx = (t1.clientX + t2.clientX) / 2;\n",
    indent + "        const cy = (t1.clientY + t2.clientY) / 2;\n",
    "\n",
    indent + "        // Initialization / Transition Check\n",
    indent + "        if (touchRef.current.mode !== 'zoom' || !touchRef.current.lastDist || !touchRef.current.lastCenter) {\n",
    indent + "            touchRef.current.mode = 'zoom';\n",
    indent + "            touchRef.current.lastDist = dist;\n",
    indent + "            touchRef.current.lastCenter = { x: cx, y: cy };\n",
    indent + "            \n",
    indent + "            // Clear Drag/LongPress States\n",
    indent + "            if (touchRef.current.longPressTimer) {\n",
    indent + "                clearTimeout(touchRef.current.longPressTimer);\n",
    indent + "                touchRef.current.longPressTimer = null;\n",
    indent + "            }\n",
    indent + "            setLongPressIndicator(null);\n",
    indent + "            setDraggingNodeId(null);\n",
    indent + "            touchRef.current.dragNodeId = null;\n",
    indent + "            return; \n",
    indent + "        }\n",
    "\n",
    indent + "        // Perform Zoom\n",
    indent + "        const currentViewport = viewportRef.current;\n",
    indent + "        let factor = dist / touchRef.current.lastDist;\n",
    indent + "        const sensitivity = settings?.zoomSensitivity || 1.0;\n",
    indent + "        if (sensitivity !== 1) factor = 1 + (factor - 1) * sensitivity;\n",
    "\n",
    indent + "        const newZoom = Math.min(Math.max(currentViewport.zoom * factor, 0.1), 10);\n",
    indent + "        const scaleFactor = newZoom / currentViewport.zoom;\n",
    indent + "        \n",
    indent + "        const vx = touchRef.current.lastCenter.x - currentViewport.x;\n",
    indent + "        const vy = touchRef.current.lastCenter.y - currentViewport.y;\n",
    indent + "        \n",
    indent + "        const nvx = vx * scaleFactor;\n",
    indent + "        const nvy = vy * scaleFactor;\n",
    indent + "        \n",
    indent + "        let newX = touchRef.current.lastCenter.x - nvx;\n",
    indent + "        let newY = touchRef.current.lastCenter.y - nvy;\n",
    indent + "        \n",
    indent + "        newX += (cx - touchRef.current.lastCenter.x);\n",
    indent + "        newY += (cy - touchRef.current.lastCenter.y);\n",
    "\n",
    indent + "        onViewportChange({ x: newX, y: newY, zoom: newZoom });\n",
    "\n",
    indent + "        touchRef.current.lastDist = dist;\n",
    indent + "        touchRef.current.lastCenter = { x: cx, y: cy };\n",
    indent + "        return;\n",
    indent + "    }\n",
    "\n",
    indent + "    // --------------------------------------------------------\n",
    indent + "    // PRIORITY 2: SINGLE FINGER -> DRAG NODE OR PAN CANVAS\n",
    indent + "    // --------------------------------------------------------\n",
    indent + "    if (e.touches.length === 1) {\n",
    indent + "        if (touchRef.current.longPressTimer) {\n",
    indent + "             const t = e.touches[0];\n",
    indent + "             const start = touchRef.current.longPressStart;\n",
    indent + "             if (start && Math.hypot(t.clientX - start.x, t.clientY - start.y) > 10) {\n",
    indent + "                 clearTimeout(touchRef.current.longPressTimer);\n",
    indent + "                 touchRef.current.longPressTimer = null;\n",
    indent + "                 setLongPressIndicator(null);\n",
    indent + "                 if (touchRef.current.mode === 'waiting') {\n",
    indent + "                     touchRef.current.mode = 'pan';\n",
    indent + "                     touchRef.current.startPan = { x: t.clientX, y: t.clientY };\n",
    indent + "                 }\n",
    indent + "             }\n",
    indent + "        }\n",
    "\n",
    indent + "        if (touchRef.current.mode === 'zoom') {\n",
    indent + "            const t = e.touches[0];\n",
    indent + "            touchRef.current.mode = 'pan';\n",
    indent + "            touchRef.current.startPan = { x: t.clientX, y: t.clientY };\n",
    indent + "            return;\n",
    indent + "        }\n",
    "\n",
    indent + "        if (touchRef.current.mode === 'dragNode' && touchRef.current.dragNodeId && touchRef.current.lastDragPos) {\n",
    indent + "            const t = e.touches[0];\n",
    indent + "            const rawDx = t.clientX - touchRef.current.lastDragPos.x;\n",
    indent + "            const rawDy = t.clientY - touchRef.current.lastDragPos.y;\n",
    indent + "            const dx = rawDx / viewportRef.current.zoom;\n",
    indent + "            const dy = rawDy / viewportRef.current.zoom;\n",
    indent + "            handleMoveNodes(dx, dy);\n",
    indent + "            touchRef.current.lastDragPos = { x: t.clientX, y: t.clientY };\n",
    indent + "            return;\n",
    indent + "        }\n",
    "\n",
    indent + "        if (touchRef.current.mode === 'pan' && touchRef.current.startPan) {\n",
    indent + "            const t = e.touches[0];\n",
    indent + "            const dx = t.clientX - touchRef.current.startPan.x;\n",
    indent + "            const dy = t.clientY - touchRef.current.startPan.y;\n",
    indent + "            const currentViewport = viewportRef.current;\n",
    indent + "            onViewportChange({ ...currentViewport, x: currentViewport.x + dx, y: currentViewport.y + dy });\n",
    indent + "            touchRef.current.startPan = { x: t.clientX, y: t.clientY };\n",
    indent + "            return;\n",
    indent + "        }\n",
    indent + "        \n",
    indent + "        if (touchRef.current.mode === 'select') {\n",
    indent + "            const t = e.touches[0];\n",
    indent + "            const rect = containerRef.current?.getBoundingClientRect();\n",
    indent + "            if (rect) {\n",
    indent + "                const curX = t.clientX - rect.left;\n",
    indent + "                const curY = t.clientY - rect.top;\n",
    indent + "                setSelectionRect(prev => prev ? ({ ...prev, currentX: curX, currentY: curY }) : null);\n",
    indent + "            }\n",
    indent + "        }\n",
    indent + "    }\n",
    indent + "};\n"
]

# Lines 719 to 839 are indices 718 to 838
start_idx = 718
end_idx = 838

# Verify context before replacing (Safety Check)
# line[718] is start
# line[838] is end (should be '      };')
if "handleNativeTouchMove" in lines[start_idx] and "};" in lines[end_idx]:
    final_lines = lines[:start_idx] + new_code + lines[end_idx+1:]
    with open(file_path, 'w') as f:
        f.writelines(final_lines)
    print("Success")
else:
    print(f"Error: Line mismatch. L{start_idx+1}: {lines[start_idx].strip()}, L{end_idx+1}: {lines[end_idx].strip()}")
