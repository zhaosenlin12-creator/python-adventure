"""
初始化盛世天下附近的真实地标
基于宜昌市猇亭区盛世天下区域
"""
from app.core.database import SessionLocal
from app.models.map_object import MapObject

def init_landmarks():
    db = SessionLocal()
    
    try:
        # 盛世天下区域的真实地标
        landmarks = [
            # 商业区
            MapObject(
                map_area="盛世天下",
                object_type="npc",
                title="华联超市",
                description="大型连锁超市，可以购买各种物资",
                icon="🏪",
                x=200,
                y=150,
                interaction_type="talk",
                rewards={"coins": 20},
                requirements={"level": 1}
            ),
            MapObject(
                map_area="盛世天下",
                object_type="npc",
                title="良品铺子",
                description="零食店，有各种美味小吃",
                icon="🍭",
                x=280,
                y=170,
                interaction_type="talk",
                rewards={"coins": 15},
                requirements={"level": 1}
            ),
            MapObject(
                map_area="盛世天下",
                object_type="npc",
                title="金汉斯烤肉",
                description="美味的烤肉自助餐厅",
                icon="🍖",
                x=350,
                y=200,
                interaction_type="talk",
                rewards={"experience": 15, "coins": 10},
                requirements={"level": 1}
            ),
            MapObject(
                map_area="盛世天下",
                object_type="npc",
                title="星巴克咖啡",
                description="休闲咖啡厅，可以休息",
                icon="☕",
                x=420,
                y=180,
                interaction_type="talk",
                rewards={"experience": 10},
                requirements={"level": 1}
            ),
            
            # 教育机构
            MapObject(
                map_area="盛世天下",
                object_type="npc",
                title="乐博士机器人教育",
                description="专业的机器人编程教育机构！在这里学习编程知识",
                icon="🤖",
                x=500,
                y=250,
                interaction_type="solve",
                rewards={"experience": 50, "coins": 30},
                requirements={"level": 1}
            ),
            MapObject(
                map_area="盛世天下",
                object_type="puzzle",
                title="编程教室",
                description="完成Python基础练习",
                icon="💻",
                x=550,
                y=280,
                interaction_type="solve",
                rewards={"experience": 40, "coins": 25},
                requirements={"level": 2}
            ),
            MapObject(
                map_area="盛世天下",
                object_type="npc",
                title="新东方教育",
                description="综合教育培训机构",
                icon="📚",
                x=600,
                y=200,
                interaction_type="talk",
                rewards={"experience": 20},
                requirements={"level": 1}
            ),
            
            # 生活服务
            MapObject(
                map_area="盛世天下",
                object_type="npc",
                title="中国银行",
                description="金融服务中心",
                icon="🏦",
                x=200,
                y=350,
                interaction_type="talk",
                rewards={"coins": 50},
                requirements={"level": 3}
            ),
            MapObject(
                map_area="盛世天下",
                object_type="npc",
                title="中国邮政",
                description="邮政服务网点",
                icon="📮",
                x=280,
                y=370,
                interaction_type="talk",
                rewards={"coins": 15},
                requirements={"level": 1}
            ),
            MapObject(
                map_area="盛世天下",
                object_type="npc",
                title="德克士快餐",
                description="快餐连锁店",
                icon="🍔",
                x=350,
                y=340,
                interaction_type="talk",
                rewards={"coins": 20},
                requirements={"level": 1}
            ),
            
            # 休闲娱乐
            MapObject(
                map_area="盛世天下",
                object_type="npc",
                title="万达影城",
                description="看电影的好地方",
                icon="🎬",
                x=450,
                y=380,
                interaction_type="talk",
                rewards={"experience": 25, "coins": 20},
                requirements={"level": 2}
            ),
            MapObject(
                map_area="盛世天下",
                object_type="npc",
                title="KTV欢唱",
                description="唱歌娱乐场所",
                icon="🎤",
                x=520,
                y=400,
                interaction_type="talk",
                rewards={"experience": 20},
                requirements={"level": 2}
            ),
            MapObject(
                map_area="盛世天下",
                object_type="chest",
                title="游戏厅",
                description="电玩城，找到隐藏宝箱",
                icon="🎮",
                x=600,
                y=370,
                interaction_type="collect",
                rewards={"experience": 30, "coins": 40},
                requirements={"level": 2}
            ),
            
            # 公园绿地
            MapObject(
                map_area="盛世天下",
                object_type="resource",
                title="小区花园",
                description="美丽的花园，可以采集资源",
                icon="🌸",
                x=700,
                y=200,
                interaction_type="collect",
                rewards={"coins": 25},
                requirements={"level": 1}
            ),
            MapObject(
                map_area="盛世天下",
                object_type="npc",
                title="健身广场",
                description="锻炼身体的好地方",
                icon="🏃",
                x=750,
                y=250,
                interaction_type="talk",
                rewards={"experience": 15},
                requirements={"level": 1}
            ),
            
            # 医疗健康
            MapObject(
                map_area="盛世天下",
                object_type="npc",
                title="社区医院",
                description="基础医疗服务",
                icon="🏥",
                x=200,
                y=500,
                interaction_type="talk",
                rewards={"experience": 20, "coins": 15},
                requirements={"level": 1}
            ),
            MapObject(
                map_area="盛世天下",
                object_type="npc",
                title="爱尔眼科",
                description="专业眼科医院",
                icon="👓",
                x=280,
                y=520,
                interaction_type="talk",
                rewards={"coins": 25},
                requirements={"level": 2}
            ),
            
            # 交通设施
            MapObject(
                map_area="盛世天下",
                object_type="npc",
                title="公交站台",
                description="可以乘坐公交车",
                icon="🚌",
                x=350,
                y=480,
                interaction_type="talk",
                rewards={"coins": 10},
                requirements={"level": 1}
            ),
            MapObject(
                map_area="盛世天下",
                object_type="npc",
                title="地下停车场",
                description="大型停车场",
                icon="🚗",
                x=450,
                y=500,
                interaction_type="talk",
                rewards={"coins": 15},
                requirements={"level": 1}
            ),
            
            # 特殊任务点
            MapObject(
                map_area="盛世天下",
                object_type="puzzle",
                title="机器人大赛",
                description="参加机器人编程大赛！",
                icon="🏆",
                x=520,
                y=550,
                interaction_type="solve",
                rewards={"experience": 100, "coins": 80},
                requirements={"level": 5}
            ),
            MapObject(
                map_area="盛世天下",
                object_type="chest",
                title="神秘宝箱",
                description="隐藏在某处的神秘宝箱",
                icon="💎",
                x=600,
                y=520,
                interaction_type="collect",
                rewards={"experience": 60, "coins": 50},
                requirements={"level": 3}
            ),
            MapObject(
                map_area="盛世天下",
                object_type="npc",
                title="编程导师",
                description="经验丰富的编程老师，可以请教问题",
                icon="👨‍🏫",
                x=700,
                y=500,
                interaction_type="talk",
                rewards={"experience": 50},
                requirements={"level": 1}
            ),
            
            # 周边区域
            MapObject(
                map_area="盛世天下",
                object_type="npc",
                title="便利店",
                description="24小时便利店",
                icon="🏪",
                x=800,
                y=150,
                interaction_type="talk",
                rewards={"coins": 10},
                requirements={"level": 1}
            ),
            MapObject(
                map_area="盛世天下",
                object_type="npc",
                title="水果店",
                description="新鲜水果专卖",
                icon="🍎",
                x=850,
                y=200,
                interaction_type="talk",
                rewards={"coins": 15},
                requirements={"level": 1}
            ),
            MapObject(
                map_area="盛世天下",
                object_type="npc",
                title="面包店",
                description="香喷喷的面包",
                icon="🥐",
                x=900,
                y=250,
                interaction_type="talk",
                rewards={"coins": 12},
                requirements={"level": 1}
            ),
            MapObject(
                map_area="盛世天下",
                object_type="resource",
                title="图书馆",
                description="安静的学习场所",
                icon="📖",
                x=800,
                y=350,
                interaction_type="collect",
                rewards={"experience": 35, "coins": 20},
                requirements={"level": 2}
            ),
            MapObject(
                map_area="盛世天下",
                object_type="puzzle",
                title="编码迷宫",
                description="用代码解开迷宫",
                icon="🗝️",
                x=850,
                y=400,
                interaction_type="solve",
                rewards={"experience": 45, "coins": 30},
                requirements={"level": 3}
            ),
            MapObject(
                map_area="盛世天下",
                object_type="npc",
                title="宠物店",
                description="可爱的宠物",
                icon="🐕",
                x=900,
                y=450,
                interaction_type="talk",
                rewards={"coins": 20},
                requirements={"level": 2}
            ),
        ]
        
        # 删除旧的盛世天下地标（避免重复）
        db.query(MapObject).filter(
            MapObject.map_area == "盛世天下",
            MapObject.title.in_([l.title for l in landmarks])
        ).delete(synchronize_session=False)
        
        # 添加新地标
        for landmark in landmarks:
            db.add(landmark)
        
        db.commit()
        print(f"✅ 成功添加 {len(landmarks)} 个盛世天下地标！")
        
        # 显示统计
        total = db.query(MapObject).filter(MapObject.map_area == "盛世天下").count()
        print(f"📊 盛世天下区域现在有 {total} 个地图对象")
        
    except Exception as e:
        print(f"❌ 错误: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("🗺️ 开始初始化盛世天下地标...")
    init_landmarks()
    print("✅ 完成！")






