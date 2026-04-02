# 简化过滤和标记逻辑 - 实现计划

## [ ] Task 1: 修改 filter_seen 方法，直接只过滤 reportUse=star 的条目
- **Priority**: P0
- **Depends On**: None
- **Description**: 
  - 移除二次过滤逻辑
  - 直接使用 report_use_only=True 进行过滤
  - 只过滤过去30天内被标记为 reportUse=star 的条目
- **Success Criteria**:
  - filter_seen 方法直接查询并过滤 reportUse=star 的条目
  - 不再有二次过滤逻辑
- **Test Requirements**:
  - `programmatic` TR-1.1: 验证 filter_seen 调用 get_seen 时使用 report_use_only=True
  - `human-judgement` TR-1.2: 检查日志输出，确认只有 reportUse=star 的条目被过滤
- **Notes**: 这样即使其他新闻看过，只要没有被简报选中过（reportUse 不是 star），就会保留下来

## [ ] Task 2: 修改 mark_as_seen 方法，只标记被简报选中的条目
- **Priority**: P0
- **Depends On**: None
- **Description**: 
  - 修改 mark_as_seen 方法，不再标记所有拉取到的新闻
  - 只标记被简报最终选中的条目（selected_urls）
- **Success Criteria**:
  - mark_as_seen 方法被修改或移除
  - 只有 selected_urls 中的条目会被标记到 Notion
- **Test Requirements**:
  - `programmatic` TR-2.1: 验证只有被简报选中的条目会被标记为已看过
  - `human-judgement` TR-2.2: 检查日志输出，确认只标记了 selected_urls 中的条目
- **Notes**: 这样可以大幅减少 Notion 数据库中的条目数量，只记录真正有价值的内容

## [ ] Task 3: 更新主流程中的调用
- **Priority**: P0
- **Depends On**: Task 1, Task 2
- **Description**: 
  - 修改 main.py 中的 run 方法
  - 移除对 mark_as_seen 的调用
  - 确保 mark_report_use 仍然被调用（标记 star）
- **Success Criteria**:
  - 主流程中不再调用 mark_as_seen
  - mark_report_use 仍然正常工作
- **Test Requirements**:
  - `programmatic` TR-3.1: 验证主流程中没有 mark_as_seen 调用
  - `human-judgement` TR-3.2: 检查主流程逻辑，确认只有 selected_urls 被处理
