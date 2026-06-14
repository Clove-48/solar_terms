#!/usr/bin/env python3
"""
计算24节气科学数据（太阳赤纬、昼长、太阳高度角、圭表影长）
基于标准天文公式，观测点：河南登封（北纬34°）
"""
import math, json

# 常量
EPSILON = math.radians(23.44)   # 黄赤交角
PHI = math.radians(34.0)        # 观测点纬度（河南登封）
GNOMON_HEIGHT = 8.0             # 表高（尺）

TERMS = [
    # (id, name, pinyin, longitude°, date_range, phenomena, agriculture, customs, folk_desc)
    (1, "立春", "lichun", 315, "2月3日-5日",
     "东风解冻，蛰虫始振，鱼陟负冰", "春耕备耕开始，修整农具",
     "迎春、咬春（吃春饼/萝卜）、打春牛",
     "立春为二十四节气之首，标志着冬季结束、春季开始。'立'即开始之意，此时万物复苏，春意渐浓。"),
    (2, "雨水", "yushui", 330, "2月18日-20日",
     "獭祭鱼，鸿雁来，草木萌动", "麦田追肥，果园修剪",
     "回娘家（川西习俗）、拉保保（找干爹）",
     "雨水节气意味着降雨开始增多，'春雨贵如油'，适宜的降水对农作物生长至关重要。"),
    (3, "惊蛰", "jingzhe", 345, "3月5日-7日",
     "桃始华，仓庚鸣，鹰化为鸠", "春耕全面展开，防虫害",
     "祭白虎、打小人、吃梨润肺",
     "惊蛰时春雷乍动，惊醒冬眠的昆虫。'惊蛰'之名反映了古人对自然现象的观察——春雷惊醒了蛰伏的动物。"),
    (4, "春分", "chunfen", 0, "3月20日-22日",
     "玄鸟至，雷乃发声，始电", "小麦拔节，油菜开花",
     "竖蛋、吃春菜、送春牛图",
     "春分日太阳直射赤道，全球昼夜等长。古时以立春至立夏为春，春分平分了春季。"),
    (5, "清明", "qingming", 15, "4月4日-6日",
     "桐始华，田鼠化为鴽，虹始见", "春播春种关键期，采茶",
     "扫墓祭祖、踏青郊游、放风筝、插柳",
     "清明节源自上古春祭，既是自然节气也是传统节日。此时气清景明，万物生长。"),
    (6, "谷雨", "guyu", 30, "4月19日-21日",
     "萍始生，鸣鸠拂其羽，戴胜降于桑", "插秧、种棉、采谷雨茶",
     "赏牡丹、禁蝎（贴谷雨贴）",
     "谷雨是春季最后一个节气，'雨生百谷'，降水增多利于谷物生长。此后气温上升加快。"),
    (7, "立夏", "lixia", 45, "5月5日-7日",
     "蝼蝈鸣，蚯蚓出，王瓜生", "早稻插秧，夏收作物管理",
     "秤人、斗蛋、尝三新",
     "立夏标志着夏季开始，'立'即开始之意。气温显著升高，雷雨增多，万物繁茂。"),
    (8, "小满", "xiaoman", 60, "5月20日-22日",
     "苦菜秀，靡草死，麦秋至", "小麦灌浆，水稻追肥",
     "祭车神、祈蚕节、吃苦菜",
     "小满指麦类等夏熟作物籽粒开始饱满但尚未成熟。'满而不溢'，蕴含中国传统哲学智慧。"),
    (9, "芒种", "mangzhong", 75, "6月5日-7日",
     "螳螂生，鵙始鸣，反舌无声", "有芒麦类收割，水稻插秧",
     "安苗、打泥巴仗、煮梅",
     "芒种又称'忙种'，是农事最繁忙的时节。'芒'指有芒作物成熟，'种'指播种。"),
    (10, "夏至", "xiazhi", 90, "6月21日-22日",
     "鹿角解，蝉始鸣，半夏生", "夏收扫尾，秋作物播种",
     "祭地、吃面（冬至饺子夏至面）",
     "夏至日太阳直射北回归线，北半球白昼最长。'至'即极至，阳气最盛。"),
    (11, "小暑", "xiaoshu", 105, "7月6日-8日",
     "温风至，蟋蟀居宇，鹰始鸷", "早稻收割，晚稻插秧",
     "吃藕、晒书画、牧牛",
     "小暑意为'小热'，天气开始炎热但尚未到最热。此时江淮流域梅雨即将结束。"),
    (12, "大暑", "dashu", 120, "7月22日-24日",
     "腐草为萤，土润溽暑，大雨时行", "水稻田间管理，抗旱防涝",
     "喝伏茶、晒伏姜、烧伏香",
     "大暑是一年中最热的时期，'暑'即炎热。高温高湿，利于农作物快速生长。"),
    (13, "立秋", "liqiu", 135, "8月7日-9日",
     "凉风至，白露降，寒蝉鸣", "中稻追肥，秋菜播种",
     "贴秋膘、啃秋（吃西瓜）、晒秋",
     "立秋标志着秋季开始。虽然暑气未消，但阳气渐收，阴气渐长，万物开始从繁茂走向成熟。"),
    (14, "处暑", "chushu", 150, "8月22日-24日",
     "鹰乃祭鸟，天地始肃，禾乃登", "晚稻管理，棉花采收",
     "开渔节、出游迎秋、放河灯",
     "处暑即'出暑'，暑气逐渐消退。此时秋高气爽，是农作物成熟收获的季节。"),
    (15, "白露", "bailu", 165, "9月7日-9日",
     "鸿雁来，玄鸟归，群鸟养羞", "秋收准备，果树采摘",
     "收清露、饮白露茶、祭祀禹王",
     "白露时节天气转凉，昼夜温差加大，水汽凝结成露水。'露凝而白'，秋意渐浓。"),
    (16, "秋分", "qiufen", 180, "9月22日-24日",
     "雷始收声，蛰虫坯户，水始涸", "秋收大忙（玉米、水稻）",
     "祭月、吃秋菜、送秋牛图",
     "秋分日太阳再次直射赤道，全球昼夜等长。此后北半球白昼渐短，黑夜渐长。"),
    (17, "寒露", "hanlu", 195, "10月7日-9日",
     "鸿雁来宾，雀入大水为蛤，菊有黄华", "秋收扫尾，冬小麦播种",
     "登高望远、赏菊、吃重阳糕",
     "寒露时露水更冷，接近凝结成霜。气温比白露更低，北方已呈深秋景象。"),
    (18, "霜降", "shuangjiang", 210, "10月23日-24日",
     "豺乃祭兽，草木黄落，蛰虫咸俯", "红薯/萝卜收获，越冬准备",
     "赏红叶、吃柿子、登高",
     "霜降是秋季最后一个节气，'气肃而凝，露结为霜'。天气渐寒，露水凝结成霜。"),
    (19, "立冬", "lidong", 225, "11月7日-8日",
     "水始冰，地始冻，雉入大水为蜃", "冬小麦出苗，农田水利建设",
     "吃饺子、酿黄酒、补冬",
     "立冬标志着冬季开始。'立'即开始，万物进入休养收藏状态。北方河水开始结冰。"),
    (20, "小雪", "xiaoxue", 240, "11月22日-23日",
     "虹藏不见，天气上升，地气下降，闭塞而成冬", "果树修剪，牲畜防寒",
     "腌咸菜、吃糍粑、晒鱼干",
     "小雪时气温下降，开始降雪但雪量不大。农谚'小雪雪满天，来年必丰年'。"),
    (21, "大雪", "daxue", 255, "12月6日-8日",
     "鶡鴠不鸣，虎始交，荔挺出", "积肥防冻，大棚蔬菜管理",
     "腌肉、进补、观赏封河",
     "大雪节气降雪量增大，地面可能有积雪。'瑞雪兆丰年'，积雪可保土壤墒情。"),
    (22, "冬至", "dongzhi", 270, "12月21日-23日",
     "蚯蚓结，麋角解，水泉动", "农田冻害防护，冬灌",
     "吃饺子（北方）、吃汤圆（南方）、祭祖",
     "冬至日太阳直射南回归线，北半球白昼最短、黑夜最长。'至'为极至，阴极阳生。"),
    (23, "小寒", "xiaohan", 285, "1月5日-7日",
     "雁北乡，鹊始巢，雉始雊", "越冬作物防寒，积肥造肥",
     "吃腊八粥、探梅、冰戏",
     "小寒是一年中最冷时段之一。'小寒胜大寒'，北方气温降至全年最低。"),
    (24, "大寒", "dahan", 300, "1月20日-21日",
     "鸡乳，征鸟厉疾，水泽腹坚", "积肥堆肥，农机检修",
     "除旧布新、腌制年肴、准备年货",
     "大寒是二十四节气之终，寒冷至极但阳气已开始萌动。'大寒到顶点，日后天渐暖'。"),
]

def calc_solar_declination(lon_deg):
    """计算太阳赤纬（度），基于太阳黄经"""
    lon_rad = math.radians(lon_deg)
    decl = math.asin(math.sin(lon_rad) * math.sin(EPSILON))
    return math.degrees(decl)

def calc_day_length(decl_deg):
    """计算昼长（小时），基于赤纬和纬度"""
    decl_rad = math.radians(decl_deg)
    cos_ha = -math.tan(PHI) * math.tan(decl_rad)
    ha = math.acos(max(-1, min(1, cos_ha)))
    return 24.0 * ha / math.pi

def calc_shadow_length(decl_deg):
    """计算圭表影长（尺），基于赤纬和表高"""
    decl_rad = math.radians(decl_deg)
    altitude = math.pi/2 - abs(PHI - decl_rad)
    return GNOMON_HEIGHT / math.tan(altitude)

def direct_point(decl_deg):
    """计算直射点纬度"""
    if decl_deg >= 0:
        return f"北纬{abs(decl_deg):.1f}°"
    else:
        return f"南纬{abs(decl_deg):.1f}°"

def hours_to_str(hours):
    """将小时转为 hhmm 格式"""
    h = int(hours)
    m = round((hours - h) * 60)
    return f"{h}h{m:02d}m"

data = []
for term in TERMS:
    id, name, pinyin, lon, date_range, phenomena, agriculture, customs, folk_desc = term
    decl = calc_solar_declination(lon)
    day_len = calc_day_length(decl)
    shadow = calc_shadow_length(decl)
    point = direct_point(decl)

    item = {
        "id": id,
        "name": name,
        "pinyin": pinyin,
        "date": date_range,
        "solarLongitude": lon,
        "science": {
            "sunDeclination": f"{decl:+.1f}°".replace("+", ""),
            "dayLength": hours_to_str(day_len),
            "shadowLength": f"{shadow:.2f}尺",
            "directPoint": point,
            "description": f"太阳黄经{lon}°。太阳直射{point}，"
                           f"北半球中纬度地区昼长{hours_to_str(day_len)}。"
                           f"以8尺圭表测影，正午影长{shadow:.2f}尺。"
        },
        "folk": {
            "phenomena": phenomena,
            "agriculture": agriculture,
            "customs": customs,
            "description": folk_desc
        },
        "animation": {
            "gestureType": "none",
            "particleColor": "#d4a574",
            "soundEffect": "",
            "scene": "default"
        }
    }
    data.append(item)

# 设置手势映射
gesture_map = {
    1: {"gestureType": "fist", "particleColor": "#4CAF50", "soundEffect": "spring_thunder", "scene": "budding"},
    10: {"gestureType": "palm", "particleColor": "#FF6B35", "soundEffect": "cicada", "scene": "sunburst"},
    16: {"gestureType": "scissors", "particleColor": "#FFD700", "soundEffect": "autumn_wind", "scene": "balance"},
}

for item in data:
    if item["id"] in gesture_map:
        item["animation"].update(gesture_map[item["id"]])

with open("data/solarTerms.json", "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("[OK] 24节气数据已生成")
print(f"  共 {len(data)} 条节气记录")
print()
print("科学数据验证：")
print(f"  春分（0°）: 赤纬 0.0°, 昼长 12h00m, 影长 {data[3]['science']['shadowLength']}")
print(f"  夏至（90°）: 赤纬 {data[9]['science']['sunDeclination']}, 昼长 {data[9]['science']['dayLength']}, 影长 {data[9]['science']['shadowLength']}")
print(f"  秋分（180°）: 赤纬 {data[15]['science']['sunDeclination']}, 昼长 {data[15]['science']['dayLength']}, 影长 {data[15]['science']['shadowLength']}")
print(f"  冬至（270°）: 赤纬 {data[21]['science']['sunDeclination']}, 昼长 {data[21]['science']['dayLength']}, 影长 {data[21]['science']['shadowLength']}")