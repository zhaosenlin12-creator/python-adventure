"""
初始化答题对战题库
"""
import sys
import os
sys.path.append(os.path.dirname(__file__))

from app.core.database import SessionLocal, engine, Base
from app.models.quiz_battle import QuizQuestion

def init_quiz_questions():
    """初始化题库"""
    
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    try:
        # 清空现有数据
        db.query(QuizQuestion).delete()
        
        # 题目数据（基于艺术编程和人机对话教案主题）
        questions = [
            # Python基础类
            QuizQuestion(
                category="Python基础",
                difficulty=1,
                question="在Python中，哪个关键字用于定义函数？",
                options=["A. function", "B. def", "C. func", "D. define"],
                correct_answer="B",
                explanation="Python使用def关键字来定义函数",
                points=10
            ),
            QuizQuestion(
                category="Python基础",
                difficulty=1,
                question="以下哪个是Python中的可变数据类型？",
                options=["A. tuple", "B. string", "C. list", "D. int"],
                correct_answer="C",
                explanation="list（列表）是可变的，可以修改其中的元素",
                points=10
            ),
            QuizQuestion(
                category="Python基础",
                difficulty=2,
                question="print()函数的作用是什么？",
                options=["A. 输入数据", "B. 输出数据到屏幕", "C. 计算数据", "D. 保存数据"],
                correct_answer="B",
                explanation="print()函数用于将内容输出到屏幕上",
                points=15
            ),
            
            # 变量和数据类型
            QuizQuestion(
                category="数据类型",
                difficulty=2,
                question="Python中，'3' + '5'的结果是什么？",
                options=["A. 8", "B. '35'", "C. 35", "D. 错误"],
                correct_answer="B",
                explanation="字符串相加会拼接在一起，结果是'35'",
                points=15
            ),
            QuizQuestion(
                category="数据类型",
                difficulty=2,
                question="如何获取列表[1,2,3,4,5]的长度？",
                options=["A. size([1,2,3,4,5])", "B. len([1,2,3,4,5])", "C. length([1,2,3,4,5])", "D. count([1,2,3,4,5])"],
                correct_answer="B",
                explanation="len()函数用于获取列表、字符串等的长度",
                points=15
            ),
            
            # 条件判断
            QuizQuestion(
                category="条件判断",
                difficulty=2,
                question="在Python中，if语句后面应该使用什么符号？",
                options=["A. ;", "B. :", "C. {", "D. then"],
                correct_answer="B",
                explanation="Python的if语句后面使用冒号:，然后缩进代码块",
                points=15
            ),
            QuizQuestion(
                category="条件判断",
                difficulty=3,
                question="以下哪个运算符用于判断两个值相等？",
                options=["A. =", "B. ==", "C. ===", "D. equals"],
                correct_answer="B",
                explanation="==用于比较两个值是否相等，=是赋值运算符",
                points=20
            ),
            
            # 循环
            QuizQuestion(
                category="循环",
                difficulty=3,
                question="for i in range(5):会循环几次？",
                options=["A. 4次", "B. 5次", "C. 6次", "D. 无限次"],
                correct_answer="B",
                explanation="range(5)生成0到4的数字，共5次循环",
                points=20
            ),
            QuizQuestion(
                category="循环",
                difficulty=3,
                question="break语句的作用是？",
                options=["A. 暂停程序", "B. 退出循环", "C. 继续下一次循环", "D. 返回函数"],
                correct_answer="B",
                explanation="break用于立即退出当前循环",
                points=20
            ),
            
            # 列表操作
            QuizQuestion(
                category="列表",
                difficulty=3,
                question="如何向列表末尾添加元素？",
                options=["A. list.add(x)", "B. list.append(x)", "C. list.insert(x)", "D. list.push(x)"],
                correct_answer="B",
                explanation="append()方法用于在列表末尾添加元素",
                points=20
            ),
            QuizQuestion(
                category="列表",
                difficulty=3,
                question="list[1:3]会返回列表的哪些元素？",
                options=["A. 第1和第2个", "B. 第2和第3个", "C. 第1、2、3个", "D. 第2个"],
                correct_answer="B",
                explanation="切片[1:3]返回索引1和2的元素（不包括索引3）",
                points=20
            ),
            
            # 字符串操作
            QuizQuestion(
                category="字符串",
                difficulty=2,
                question="如何将字符串转换为大写？",
                options=["A. str.uppercase()", "B. str.upper()", "C. str.toUpper()", "D. str.capitalize()"],
                correct_answer="B",
                explanation="upper()方法将字符串转换为全大写",
                points=15
            ),
            QuizQuestion(
                category="字符串",
                difficulty=3,
                question="'hello'.replace('l', 'L')的结果是？",
                options=["A. 'heLLo'", "B. 'heLlo'", "C. 'hello'", "D. 'HeLLo'"],
                correct_answer="A",
                explanation="replace()会替换所有匹配的字符",
                points=20
            ),
            
            # 字典
            QuizQuestion(
                category="字典",
                difficulty=3,
                question="如何获取字典中key对应的值？",
                options=["A. dict[key]", "B. dict.key", "C. dict(key)", "D. dict->key"],
                correct_answer="A",
                explanation="使用方括号[]访问字典的值",
                points=20
            ),
            QuizQuestion(
                category="字典",
                difficulty=4,
                question="如何检查字典中是否存在某个键？",
                options=["A. key in dict", "B. dict.has(key)", "C. dict.exists(key)", "D. dict.contains(key)"],
                correct_answer="A",
                explanation="使用in关键字检查键是否存在于字典中",
                points=25
            ),
            
            # 函数
            QuizQuestion(
                category="函数",
                difficulty=3,
                question="函数中return语句的作用是？",
                options=["A. 打印结果", "B. 返回值并结束函数", "C. 继续执行", "D. 调用函数"],
                correct_answer="B",
                explanation="return用于返回函数结果并结束函数执行",
                points=20
            ),
            QuizQuestion(
                category="函数",
                difficulty=4,
                question="函数的参数默认值如何设置？",
                options=["A. def func(x=10):", "B. def func(x:10):", "C. def func(x==10):", "D. def func(x->10):"],
                correct_answer="A",
                explanation="使用=号设置参数的默认值",
                points=25
            ),
            
            # 算法思维
            QuizQuestion(
                category="算法",
                difficulty=4,
                question="二分查找的时间复杂度是？",
                options=["A. O(n)", "B. O(log n)", "C. O(n²)", "D. O(1)"],
                correct_answer="B",
                explanation="二分查找每次将搜索范围减半，时间复杂度为O(log n)",
                points=25
            ),
            QuizQuestion(
                category="算法",
                difficulty=4,
                question="冒泡排序的基本思想是？",
                options=["A. 分而治之", "B. 相邻元素比较交换", "C. 递归处理", "D. 哈希映射"],
                correct_answer="B",
                explanation="冒泡排序通过重复比较相邻元素并交换来排序",
                points=25
            ),
            
            # 面向对象
            QuizQuestion(
                category="面向对象",
                difficulty=4,
                question="在Python中，如何定义一个类？",
                options=["A. class MyClass:", "B. class MyClass()", "C. def class MyClass:", "D. new class MyClass:"],
                correct_answer="A",
                explanation="使用class关键字定义类",
                points=25
            ),
            QuizQuestion(
                category="面向对象",
                difficulty=5,
                question="__init__方法的作用是？",
                options=["A. 销毁对象", "B. 初始化对象", "C. 调用对象", "D. 复制对象"],
                correct_answer="B",
                explanation="__init__是构造函数，用于初始化对象",
                points=30
            ),
            
            # 艺术编程相关（turtle、graphics）
            QuizQuestion(
                category="艺术编程",
                difficulty=2,
                question="在turtle库中，哪个命令让海龟向前移动？",
                options=["A. move()", "B. forward()", "C. go()", "D. walk()"],
                correct_answer="B",
                explanation="forward()或fd()命令让海龟向前移动",
                points=15
            ),
            QuizQuestion(
                category="艺术编程",
                difficulty=3,
                question="在Python中，RGB颜色(255, 0, 0)表示什么颜色？",
                options=["A. 绿色", "B. 蓝色", "C. 红色", "D. 黄色"],
                correct_answer="C",
                explanation="RGB中第一个值255表示红色通道最大值",
                points=20
            ),
            
            # 文件操作
            QuizQuestion(
                category="文件操作",
                difficulty=4,
                question="以只读模式打开文件应该使用哪个参数？",
                options=["A. 'w'", "B. 'r'", "C. 'a'", "D. 'x'"],
                correct_answer="B",
                explanation="'r'模式表示只读模式",
                points=25
            ),
            
            # 异常处理
            QuizQuestion(
                category="异常处理",
                difficulty=4,
                question="捕获异常使用哪个关键字？",
                options=["A. catch", "B. except", "C. error", "D. handle"],
                correct_answer="B",
                explanation="Python使用except来捕获异常",
                points=25
            ),
            
            # 模块导入
            QuizQuestion(
                category="模块",
                difficulty=3,
                question="如何导入random模块？",
                options=["A. include random", "B. import random", "C. use random", "D. require random"],
                correct_answer="B",
                explanation="使用import关键字导入模块",
                points=20
            ),
        ]
        
        db.add_all(questions)
        db.commit()
        
        print(f"✅ 成功初始化 {len(questions)} 道题目")
        
        # 统计各分类题目数量
        categories = {}
        for q in questions:
            categories[q.category] = categories.get(q.category, 0) + 1
        
        print("\n题目分类统计:")
        for cat, count in categories.items():
            print(f"  📚 {cat}: {count} 题")
        
        # 统计难度分布
        difficulties = {}
        for q in questions:
            difficulties[q.difficulty] = difficulties.get(q.difficulty, 0) + 1
        
        print("\n难度分布:")
        for diff, count in sorted(difficulties.items()):
            stars = "⭐" * diff
            print(f"  {stars} 难度{diff}: {count} 题")
        
    except Exception as e:
        print(f"❌ 初始化失败: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("📝 初始化答题对战题库...")
    print("=" * 60)
    init_quiz_questions()
    print("=" * 60)
    print("\n✅ 完成！")







