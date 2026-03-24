/**
 * 社区关卡类型定义
 * 用于社区关卡浏览、发布功能
 * 
 * Requirements: 2.2 - 显示关卡名称、作者名、难度、游玩次数、发布日期
 */

/**
 * 社区关卡摘要 (用于列表展示)
 */
export interface CommunityLevelSummary {
  id: string;
  name: string;
  description: string | null;
  difficulty: number;
  author_name: string;
  author_id: number;
  play_count: number;
  like_count: number;
  published_at: string;
  is_liked: boolean;
}

/**
 * 社区关卡详情 (包含完整关卡数据)
 */
export interface CommunityLevelDetail extends CommunityLevelSummary {
  map_width: number;
  map_height: number;
  level_data: Record<string, unknown>;
}

/**
 * 社区关卡列表分页响应
 */
export interface CommunityLevelListResponse {
  levels: CommunityLevelSummary[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

/**
 * 获取社区关卡列表参数
 */
export interface GetCommunityLevelsParams {
  page?: number;
  limit?: number;
  sort?: 'newest' | 'most_played' | 'difficulty';
}

/**
 * 发布关卡响应
 */
export interface PublishLevelResponse {
  success: boolean;
  message: string;
  published_at: string;
}

/**
 * 取消发布响应
 */
export interface UnpublishLevelResponse {
  success: boolean;
  message: string;
}

/**
 * 点赞响应
 */
export interface LikeLevelResponse {
  success: boolean;
  like_count: number;
}

/**
 * 取消点赞响应
 */
export interface UnlikeLevelResponse {
  success: boolean;
  like_count: number;
}

/**
 * 记录游玩响应
 */
export interface RecordPlayResponse {
  success: boolean;
  play_count: number;
}

/**
 * 发布状态响应
 */
export interface PublishStatusResponse {
  published_count: number;
  max_published: number;
  can_publish: boolean;
  remaining: number;
}
