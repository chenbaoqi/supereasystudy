// 高中英语（人教版 2019 新课标）——必修第一册。
// 每单元按主题铺核心词汇，每词配词义选择题；发音走 TTS。
// 由 scripts/add_english_high.js 挂到英语「词汇」路径，作为教材「人教版英语 2019」。
module.exports = {
  textbook: {
    name: '人教版英语 2019',
    order: 3,
    curriculumVersion: '人教版2019',
    semesters: [
      {
        name: '高一上册',
        order: 1,
        grade: 10,
        stage: 'senior',
        chapters: [
          {
            title: 'Welcome Unit',
            order: 1,
            knowledge: [
              {
                word: 'exchange',
                meaning: '交换；交流',
                order: 1,
                partOfSpeech: 'v./n.',
                example: 'exchange ideas',
                quiz: [
                  {
                    stem: '「exchange」的意思是？',
                    options: ['交换；交流', '拒绝', '隐藏', '破坏'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'lecture',
                meaning: '讲座；讲课',
                order: 2,
                partOfSpeech: 'n.',
                example: 'attend a lecture',
                quiz: [
                  {
                    stem: '「lecture」的意思是？',
                    options: ['讲座', '运动', '旅行', '考试'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'register',
                meaning: '注册；登记',
                order: 3,
                partOfSpeech: 'v.',
                example: 'register for the course',
                quiz: [
                  {
                    stem: '「register」的意思是？',
                    options: ['注册；登记', '取消', '忘记', '离开'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'nationality',
                meaning: '国籍',
                order: 4,
                partOfSpeech: 'n.',
                example: 'What is your nationality?',
                quiz: [
                  {
                    stem: '「nationality」的意思是？',
                    options: ['国籍', '民族', '国家', '地区'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'campus',
                meaning: '校园',
                order: 5,
                partOfSpeech: 'n.',
                example: 'on campus',
                quiz: [
                  {
                    stem: '「campus」的意思是？',
                    options: ['校园', '教室', '操场', '宿舍'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'formal',
                meaning: '正式的',
                order: 6,
                partOfSpeech: 'adj.',
                example: 'formal dress',
                quiz: [
                  {
                    stem: '「formal」的意思是？',
                    options: ['正式的', '随便的', '旧的', '小的'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'anxious',
                meaning: '焦虑的；不安的',
                order: 7,
                partOfSpeech: 'adj.',
                example: 'feel anxious',
                quiz: [
                  {
                    stem: '「anxious」的意思是？',
                    options: ['焦虑的', '高兴的', '平静的', '兴奋的'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'annoyed',
                meaning: '恼怒的',
                order: 8,
                partOfSpeech: 'adj.',
                example: 'feel annoyed',
                quiz: [
                  {
                    stem: '「annoyed」的意思是？',
                    options: ['恼怒的', '高兴的', '害怕的', '疲惫的'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'frightened',
                meaning: '受惊的；害怕的',
                order: 9,
                partOfSpeech: 'adj.',
                example: 'be frightened of',
                quiz: [
                  {
                    stem: '「frightened」的意思是？',
                    options: ['害怕的', '勇敢的', '兴奋的', '无聊的'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'confident',
                meaning: '自信的',
                order: 10,
                partOfSpeech: 'adj.',
                example: 'be confident about',
                quiz: [
                  {
                    stem: '「confident」的意思是？',
                    options: ['自信的', '害羞的', '紧张的', '懒惰的'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'concentrate',
                meaning: '集中（注意力）',
                order: 11,
                partOfSpeech: 'v.',
                example: 'concentrate on study',
                quiz: [
                  {
                    stem: '「concentrate on」的意思是？',
                    options: ['集中注意力于', '放弃', '逃避', '厌恶'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'experiment',
                meaning: '实验',
                order: 12,
                partOfSpeech: 'n.',
                example: 'do an experiment',
                quiz: [
                  {
                    stem: '「experiment」的意思是？',
                    options: ['实验', '运动', '旅行', '讲座'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'junior',
                meaning: '初级的；年少的',
                order: 13,
                partOfSpeech: 'adj.',
                example: 'junior high school',
                quiz: [
                  {
                    stem: '「junior」的意思是？',
                    options: ['初级的；年少的', '高级的', '年长的', '中年的'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'senior',
                meaning: '高级的；年长的',
                order: 14,
                partOfSpeech: 'adj.',
                example: 'senior high school',
                quiz: [
                  {
                    stem: '「senior」的意思是？',
                    options: ['高级的；年长的', '初级的', '年幼的', '中等的'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'impress',
                meaning: '使留下深刻印象',
                order: 15,
                partOfSpeech: 'v.',
                example: 'impress others',
                quiz: [
                  {
                    stem: '「impress」的意思是？',
                    options: ['使留下深刻印象', '使失望', '使生气', '使害怕'],
                    answerIndex: 0,
                  },
                ],
              },
            ],
          },
          {
            title: 'Unit 1 Teenage Life',
            order: 2,
            knowledge: [
              {
                word: 'teenage',
                meaning: '青少年的；十几岁的',
                order: 1,
                partOfSpeech: 'adj.',
                example: 'teenage problems',
                quiz: [
                  {
                    stem: '「teenage」的意思是？',
                    options: ['青少年的', '成年的', '老年的', '中年的'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'volunteer',
                meaning: '志愿者；自愿做',
                order: 2,
                partOfSpeech: 'n./v.',
                example: 'work as a volunteer',
                quiz: [
                  {
                    stem: '「volunteer」的意思是？',
                    options: ['志愿者', '老师', '医生', '工人'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'debate',
                meaning: '辩论',
                order: 3,
                partOfSpeech: 'n./v.',
                example: 'have a debate',
                quiz: [
                  {
                    stem: '「debate」的意思是？',
                    options: ['辩论', '唱歌', '跑步', '画画'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'content',
                meaning: '内容；满足的',
                order: 4,
                partOfSpeech: 'n./adj.',
                example: 'the content of the book',
                quiz: [
                  {
                    stem: '「content」的意思是？',
                    options: ['内容；满足的', '容器', '竞赛', '结论'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'movement',
                meaning: '运动；动作',
                order: 5,
                partOfSpeech: 'n.',
                example: 'a quick movement',
                quiz: [
                  {
                    stem: '「movement」的意思是？',
                    options: ['运动；动作', '安静', '休息', '停止'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'suitable',
                meaning: '合适的',
                order: 6,
                partOfSpeech: 'adj.',
                example: 'suitable for children',
                quiz: [
                  {
                    stem: '「suitable」的意思是？',
                    options: ['合适的', '危险的', '昂贵的', '困难的'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'challenge',
                meaning: '挑战',
                order: 7,
                partOfSpeech: 'n./v.',
                example: 'face a challenge',
                quiz: [
                  {
                    stem: '「challenge」的意思是？',
                    options: ['挑战', '机会', '礼物', '胜利'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'topic',
                meaning: '话题；主题',
                order: 8,
                partOfSpeech: 'n.',
                example: 'a hot topic',
                quiz: [
                  {
                    stem: '「topic」的意思是？',
                    options: ['话题', '答案', '问题', '题目'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'extra',
                meaning: '额外的',
                order: 9,
                partOfSpeech: 'adj.',
                example: 'extra homework',
                quiz: [
                  {
                    stem: '「extra」的意思是？',
                    options: ['额外的', '缺少的', '普通的', '必要的'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'obviously',
                meaning: '显然地',
                order: 10,
                partOfSpeech: 'adv.',
                example: 'obviously wrong',
                quiz: [
                  {
                    stem: '「obviously」的意思是？',
                    options: ['显然地', '隐藏地', '故意地', '偶然地'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'quit',
                meaning: '停止；放弃',
                order: 11,
                partOfSpeech: 'v.',
                example: 'quit smoking',
                quiz: [
                  {
                    stem: '「quit」的意思是？',
                    options: ['停止；放弃', '开始', '继续', '坚持'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'responsible',
                meaning: '负责的',
                order: 12,
                partOfSpeech: 'adj.',
                example: 'be responsible for',
                quiz: [
                  {
                    stem: '「responsible」的意思是？',
                    options: ['负责的', '逃避的', '马虎的', '自私的'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'solution',
                meaning: '解决办法',
                order: 13,
                partOfSpeech: 'n.',
                example: 'find a solution',
                quiz: [
                  {
                    stem: '「solution」的意思是？',
                    options: ['解决办法', '问题', '困难', '答案'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'schedule',
                meaning: '日程安排',
                order: 14,
                partOfSpeech: 'n.',
                example: 'a busy schedule',
                quiz: [
                  {
                    stem: '「schedule」的意思是？',
                    options: ['日程安排', '地图', '清单', '表格'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'editor',
                meaning: '编辑',
                order: 15,
                partOfSpeech: 'n.',
                example: 'a newspaper editor',
                quiz: [
                  {
                    stem: '「editor」的意思是？',
                    options: ['编辑', '作者', '读者', '记者'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'adult',
                meaning: '成年人',
                order: 16,
                partOfSpeech: 'n.',
                example: 'an adult ticket',
                quiz: [
                  {
                    stem: '「adult」的意思是？',
                    options: ['成年人', '儿童', '青少年', '老人'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'behaviour',
                meaning: '行为；举止',
                order: 17,
                partOfSpeech: 'n.',
                example: 'good behaviour',
                quiz: [
                  {
                    stem: '「behaviour」的意思是？',
                    options: ['行为；举止', '外貌', '性格', '习惯'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'graduate',
                meaning: '毕业',
                order: 18,
                partOfSpeech: 'v.',
                example: 'graduate from high school',
                quiz: [
                  {
                    stem: '「graduate」的意思是？',
                    options: ['毕业', '入学', '退学', '转学'],
                    answerIndex: 0,
                  },
                ],
              },
            ],
          },
          {
            title: 'Unit 2 Travelling Around',
            order: 3,
            knowledge: [
              {
                word: 'destination',
                meaning: '目的地',
                order: 1,
                partOfSpeech: 'n.',
                example: 'arrive at the destination',
                quiz: [
                  {
                    stem: '「destination」的意思是？',
                    options: ['目的地', '出发点', '车站', '机场'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'arrange',
                meaning: '安排；筹备',
                order: 2,
                partOfSpeech: 'v.',
                example: 'arrange a trip',
                quiz: [
                  {
                    stem: '「arrange」的意思是？',
                    options: ['安排', '取消', '推迟', '忘记'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'accommodation',
                meaning: '住宿；住处',
                order: 3,
                partOfSpeech: 'n.',
                example: 'book accommodation',
                quiz: [
                  {
                    stem: '「accommodation」的意思是？',
                    options: ['住宿', '交通', '饮食', '门票'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'reservation',
                meaning: '预订',
                order: 4,
                partOfSpeech: 'n.',
                example: 'make a reservation',
                quiz: [
                  {
                    stem: '「reservation」的意思是？',
                    options: ['预订', '取消', '付款', '退款'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'transport',
                meaning: '交通；运输',
                order: 5,
                partOfSpeech: 'n./v.',
                example: 'public transport',
                quiz: [
                  {
                    stem: '「transport」的意思是？',
                    options: ['交通；运输', '建筑', '通信', '教育'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'economy',
                meaning: '经济',
                order: 6,
                partOfSpeech: 'n.',
                example: 'economy class',
                quiz: [
                  {
                    stem: '「economy」的意思是？',
                    options: ['经济', '政治', '文化', '科学'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'credit',
                meaning: '信用；学分',
                order: 7,
                partOfSpeech: 'n.',
                example: 'credit card',
                quiz: [
                  {
                    stem: '「credit card」的意思是？',
                    options: ['信用卡', '身份证', '会员卡', '名片'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'detail',
                meaning: '细节',
                order: 8,
                partOfSpeech: 'n.',
                example: 'in detail',
                quiz: [
                  {
                    stem: '「detail」的意思是？',
                    options: ['细节', '大概', '整体', '结论'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'request',
                meaning: '请求；要求',
                order: 9,
                partOfSpeech: 'n./v.',
                example: 'make a request',
                quiz: [
                  {
                    stem: '「request」的意思是？',
                    options: ['请求；要求', '拒绝', '回答', '询问'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'view',
                meaning: '景色；观点',
                order: 10,
                partOfSpeech: 'n.',
                example: 'a beautiful view',
                quiz: [
                  {
                    stem: '「view」的意思是？',
                    options: ['景色；观点', '声音', '气味', '味道'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'sight',
                meaning: '景象；名胜',
                order: 11,
                partOfSpeech: 'n.',
                example: 'see the sights',
                quiz: [
                  {
                    stem: '「sight」的意思是？',
                    options: ['景象；名胜', '声音', '味道', '触觉'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'statue',
                meaning: '雕像',
                order: 12,
                partOfSpeech: 'n.',
                example: 'a bronze statue',
                quiz: [
                  {
                    stem: '「statue」的意思是？',
                    options: ['雕像', '图画', '建筑', '桥梁'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'castle',
                meaning: '城堡',
                order: 13,
                partOfSpeech: 'n.',
                example: 'an old castle',
                quiz: [
                  {
                    stem: '「castle」的意思是？',
                    options: ['城堡', '宫殿', '寺庙', '塔'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'visa',
                meaning: '签证',
                order: 14,
                partOfSpeech: 'n.',
                example: 'apply for a visa',
                quiz: [
                  {
                    stem: '「visa」的意思是？',
                    options: ['签证', '护照', '机票', '门票'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'route',
                meaning: '路线',
                order: 15,
                partOfSpeech: 'n.',
                example: 'the shortest route',
                quiz: [
                  {
                    stem: '「route」的意思是？',
                    options: ['路线', '地点', '方向', '距离'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'extremely',
                meaning: '极其；非常',
                order: 16,
                partOfSpeech: 'adv.',
                example: 'extremely important',
                quiz: [
                  {
                    stem: '「extremely」的意思是？',
                    options: ['极其；非常', '稍微', '几乎不', '完全不'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'official',
                meaning: '官方的；官员',
                order: 17,
                partOfSpeech: 'adj./n.',
                example: 'official language',
                quiz: [
                  {
                    stem: '「official」的意思是？',
                    options: ['官方的', '私人的', '民间的', '非正式的'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'unique',
                meaning: '独特的',
                order: 18,
                partOfSpeech: 'adj.',
                example: 'a unique style',
                quiz: [
                  {
                    stem: '「unique」的意思是？',
                    options: ['独特的', '普通的', '相似的', '常见的'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'contact',
                meaning: '联系；接触',
                order: 19,
                partOfSpeech: 'v./n.',
                example: 'contact me',
                quiz: [
                  {
                    stem: '「contact」的意思是？',
                    options: ['联系；接触', '分离', '拒绝', '忘记'],
                    answerIndex: 0,
                  },
                ],
              },
            ],
          },
          {
            title: 'Unit 3 Sports and Fitness',
            order: 4,
            knowledge: [
              {
                word: 'athlete',
                meaning: '运动员',
                order: 1,
                partOfSpeech: 'n.',
                example: 'a famous athlete',
                quiz: [
                  {
                    stem: '「athlete」的意思是？',
                    options: ['运动员', '教练', '裁判', '观众'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'champion',
                meaning: '冠军',
                order: 2,
                partOfSpeech: 'n.',
                example: 'the world champion',
                quiz: [
                  {
                    stem: '「champion」的意思是？',
                    options: ['冠军', '亚军', '季军', '选手'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'fitness',
                meaning: '健康；健身',
                order: 3,
                partOfSpeech: 'n.',
                example: 'fitness centre',
                quiz: [
                  {
                    stem: '「fitness」的意思是？',
                    options: ['健康；健身', '疾病', '肥胖', '疲劳'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'gymnasium',
                meaning: '体育馆；健身房',
                order: 4,
                partOfSpeech: 'n.',
                example: 'work out in the gymnasium',
                quiz: [
                  {
                    stem: '「gymnasium」的意思是？',
                    options: ['体育馆', '图书馆', '实验室', '食堂'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'stadium',
                meaning: '体育场',
                order: 5,
                partOfSpeech: 'n.',
                example: 'a big stadium',
                quiz: [
                  {
                    stem: '「stadium」的意思是？',
                    options: ['体育场', '剧院', '博物馆', '公园'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'event',
                meaning: '比赛项目；事件',
                order: 6,
                partOfSpeech: 'n.',
                example: 'a sports event',
                quiz: [
                  {
                    stem: '「event」的意思是？',
                    options: ['比赛项目；事件', '地点', '时间', '人物'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'track',
                meaning: '跑道；轨道',
                order: 7,
                partOfSpeech: 'n.',
                example: 'run on the track',
                quiz: [
                  {
                    stem: '「track」的意思是？',
                    options: ['跑道', '球场', '泳池', '看台'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'master',
                meaning: '掌握；精通',
                order: 8,
                partOfSpeech: 'v.',
                example: 'master a skill',
                quiz: [
                  {
                    stem: '「master」的意思是？',
                    options: ['掌握；精通', '放弃', '忘记', '忽视'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'honour',
                meaning: '荣誉；尊敬',
                order: 9,
                partOfSpeech: 'n./v.',
                example: 'win honour',
                quiz: [
                  {
                    stem: '「honour」的意思是？',
                    options: ['荣誉；尊敬', '耻辱', '失败', '批评'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'glory',
                meaning: '光荣；荣耀',
                order: 10,
                partOfSpeech: 'n.',
                example: 'win glory for the team',
                quiz: [
                  {
                    stem: '「glory」的意思是？',
                    options: ['光荣；荣耀', '失败', '耻辱', '困难'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'determination',
                meaning: '决心',
                order: 11,
                partOfSpeech: 'n.',
                example: 'with determination',
                quiz: [
                  {
                    stem: '「determination」的意思是？',
                    options: ['决心', '犹豫', '放弃', '懒惰'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'injure',
                meaning: '使受伤',
                order: 12,
                partOfSpeech: 'v.',
                example: "injure one's leg",
                quiz: [
                  {
                    stem: '「injure」的意思是？',
                    options: ['使受伤', '治愈', '保护', '锻炼'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'strength',
                meaning: '力量；长处',
                order: 13,
                partOfSpeech: 'n.',
                example: 'build strength',
                quiz: [
                  {
                    stem: '「strength」的意思是？',
                    options: ['力量；长处', '弱点', '速度', '体重'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'compete',
                meaning: '竞争；比赛',
                order: 14,
                partOfSpeech: 'v.',
                example: 'compete in the match',
                quiz: [
                  {
                    stem: '「compete」的意思是？',
                    options: ['竞争；比赛', '合作', '放弃', '观看'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'pretend',
                meaning: '假装',
                order: 15,
                partOfSpeech: 'v.',
                example: 'pretend to be ill',
                quiz: [
                  {
                    stem: '「pretend」的意思是？',
                    options: ['假装', '承认', '否认', '揭露'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'million',
                meaning: '百万',
                order: 16,
                partOfSpeech: 'num.',
                example: 'two million people',
                quiz: [
                  {
                    stem: '「million」的意思是？',
                    options: ['百万', '千', '万', '十亿'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'cheat',
                meaning: '作弊；欺骗',
                order: 17,
                partOfSpeech: 'v.',
                example: 'cheat in the exam',
                quiz: [
                  {
                    stem: '「cheat」的意思是？',
                    options: ['作弊；欺骗', '诚实', '努力', '帮助'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'audience',
                meaning: '观众；听众',
                order: 18,
                partOfSpeech: 'n.',
                example: 'the audience cheered',
                quiz: [
                  {
                    stem: '「audience」的意思是？',
                    options: ['观众；听众', '演员', '裁判', '选手'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'positive',
                meaning: '积极的；正面的',
                order: 19,
                partOfSpeech: 'adj.',
                example: 'a positive attitude',
                quiz: [
                  {
                    stem: '「positive」的意思是？',
                    options: ['积极的', '消极的', '中立的', '负面的'],
                    answerIndex: 0,
                  },
                ],
              },
            ],
          },
          {
            title: 'Unit 4 Natural Disasters',
            order: 5,
            knowledge: [
              {
                word: 'disaster',
                meaning: '灾难；灾害',
                order: 1,
                partOfSpeech: 'n.',
                example: 'a natural disaster',
                quiz: [
                  {
                    stem: '「disaster」的意思是？',
                    options: ['灾难；灾害', '节日', '庆典', '丰收'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'earthquake',
                meaning: '地震',
                order: 2,
                partOfSpeech: 'n.',
                example: 'a strong earthquake',
                quiz: [
                  {
                    stem: '「earthquake」的意思是？',
                    options: ['地震', '洪水', '台风', '海啸'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'flood',
                meaning: '洪水',
                order: 3,
                partOfSpeech: 'n.',
                example: 'the flood destroyed houses',
                quiz: [
                  {
                    stem: '「flood」的意思是？',
                    options: ['洪水', '火灾', '地震', '干旱'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'drought',
                meaning: '干旱',
                order: 4,
                partOfSpeech: 'n.',
                example: 'a long drought',
                quiz: [
                  {
                    stem: '「drought」的意思是？',
                    options: ['干旱', '洪水', '暴雨', '地震'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'landslide',
                meaning: '山体滑坡',
                order: 5,
                partOfSpeech: 'n.',
                example: 'caused by a landslide',
                quiz: [
                  {
                    stem: '「landslide」的意思是？',
                    options: ['山体滑坡', '火山', '海啸', '龙卷风'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'tsunami',
                meaning: '海啸',
                order: 6,
                partOfSpeech: 'n.',
                example: 'a huge tsunami',
                quiz: [
                  {
                    stem: '「tsunami」的意思是？',
                    options: ['海啸', '地震', '火山', '台风'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'rescue',
                meaning: '营救；救援',
                order: 7,
                partOfSpeech: 'v./n.',
                example: 'rescue the survivors',
                quiz: [
                  {
                    stem: '「rescue」的意思是？',
                    options: ['营救；救援', '放弃', '破坏', '忽视'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'damage',
                meaning: '损害；损坏',
                order: 8,
                partOfSpeech: 'n./v.',
                example: 'cause great damage',
                quiz: [
                  {
                    stem: '「damage」的意思是？',
                    options: ['损害；损坏', '修复', '保护', '建设'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'destroy',
                meaning: '摧毁；破坏',
                order: 9,
                partOfSpeech: 'v.',
                example: 'destroy the building',
                quiz: [
                  {
                    stem: '「destroy」的意思是？',
                    options: ['摧毁；破坏', '建造', '修复', '保护'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'survive',
                meaning: '幸存；存活',
                order: 10,
                partOfSpeech: 'v.',
                example: 'survive the earthquake',
                quiz: [
                  {
                    stem: '「survive」的意思是？',
                    options: ['幸存；存活', '死亡', '受伤', '失踪'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'shelter',
                meaning: '避难所；庇护',
                order: 11,
                partOfSpeech: 'n./v.',
                example: 'take shelter',
                quiz: [
                  {
                    stem: '「shelter」的意思是？',
                    options: ['避难所；庇护', '监狱', '学校', '医院'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'ruin',
                meaning: '废墟；毁坏',
                order: 12,
                partOfSpeech: 'n./v.',
                example: 'in ruins',
                quiz: [
                  {
                    stem: '「ruin」的意思是？',
                    options: ['废墟；毁坏', '建筑', '花园', '道路'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'trap',
                meaning: '使陷入困境；陷阱',
                order: 13,
                partOfSpeech: 'v./n.',
                example: 'be trapped in',
                quiz: [
                  {
                    stem: '「trap」的意思是？',
                    options: ['使陷入困境', '释放', '拯救', '逃离'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'bury',
                meaning: '掩埋；埋葬',
                order: 14,
                partOfSpeech: 'v.',
                example: 'be buried under the ruins',
                quiz: [
                  {
                    stem: '「bury」的意思是？',
                    options: ['掩埋；埋葬', '挖出', '发现', '寻找'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'supply',
                meaning: '供应；补给',
                order: 15,
                partOfSpeech: 'n./v.',
                example: 'medical supplies',
                quiz: [
                  {
                    stem: '「supply」的意思是？',
                    options: ['供应；补给', '需求', '消耗', '储存'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'emergency',
                meaning: '紧急情况',
                order: 16,
                partOfSpeech: 'n.',
                example: 'in an emergency',
                quiz: [
                  {
                    stem: '「emergency」的意思是？',
                    options: ['紧急情况', '日常', '假期', '庆典'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'aid',
                meaning: '援助；帮助',
                order: 17,
                partOfSpeech: 'n./v.',
                example: 'first aid',
                quiz: [
                  {
                    stem: '「aid」的意思是？',
                    options: ['援助；帮助', '阻碍', '伤害', '放弃'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'crash',
                meaning: '碰撞；坠毁',
                order: 18,
                partOfSpeech: 'v./n.',
                example: 'a car crash',
                quiz: [
                  {
                    stem: '「crash」的意思是？',
                    options: ['碰撞；坠毁', '起飞', '降落', '行驶'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'sweep',
                meaning: '扫；席卷',
                order: 19,
                partOfSpeech: 'v.',
                example: 'sweep away',
                quiz: [
                  {
                    stem: '「sweep」的意思是？',
                    options: ['扫；席卷', '堆积', '清除', '放弃'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'strike',
                meaning: '袭击；罢工',
                order: 20,
                partOfSpeech: 'v./n.',
                example: 'strike the area',
                quiz: [
                  {
                    stem: '「strike」的意思是？',
                    options: ['袭击；罢工', '保护', '帮助', '逃离'],
                    answerIndex: 0,
                  },
                ],
              },
            ],
          },
          {
            title: 'Unit 5 Languages Around the World',
            order: 6,
            knowledge: [
              {
                word: 'native',
                meaning: '本地的；母语的',
                order: 1,
                partOfSpeech: 'adj.',
                example: 'native language',
                quiz: [
                  {
                    stem: '「native」的意思是？',
                    options: ['本地的；母语的', '外国的', '陌生的', '遥远的'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'dialect',
                meaning: '方言',
                order: 2,
                partOfSpeech: 'n.',
                example: 'speak in dialect',
                quiz: [
                  {
                    stem: '「dialect」的意思是？',
                    options: ['方言', '普通话', '外语', '行话'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'character',
                meaning: '汉字；性格；角色',
                order: 3,
                partOfSpeech: 'n.',
                example: 'Chinese characters',
                quiz: [
                  {
                    stem: '「character」的意思是？',
                    options: ['汉字；性格；角色', '数字', '字母', '符号'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'billion',
                meaning: '十亿',
                order: 4,
                partOfSpeech: 'num.',
                example: 'one billion people',
                quiz: [
                  {
                    stem: '「billion」的意思是？',
                    options: ['十亿', '百万', '千万', '一万亿'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'attitude',
                meaning: '态度',
                order: 5,
                partOfSpeech: 'n.',
                example: 'a positive attitude',
                quiz: [
                  {
                    stem: '「attitude」的意思是？',
                    options: ['态度', '能力', '知识', '技能'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'reference',
                meaning: '参考；提及',
                order: 6,
                partOfSpeech: 'n.',
                example: 'for reference',
                quiz: [
                  {
                    stem: '「reference」的意思是？',
                    options: ['参考；提及', '拒绝', '遗忘', '忽视'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'base',
                meaning: '基础；基地',
                order: 7,
                partOfSpeech: 'n.',
                example: 'based on facts',
                quiz: [
                  {
                    stem: '「base」的意思是？',
                    options: ['基础；基地', '顶部', '中心', '边缘'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'symbol',
                meaning: '象征；符号',
                order: 8,
                partOfSpeech: 'n.',
                example: 'a symbol of peace',
                quiz: [
                  {
                    stem: '「symbol」的意思是？',
                    options: ['象征；符号', '实物', '声音', '颜色'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'carve',
                meaning: '雕刻',
                order: 9,
                partOfSpeech: 'v.',
                example: 'carve characters',
                quiz: [
                  {
                    stem: '「carve」的意思是？',
                    options: ['雕刻', '绘画', '书写', '印刷'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'dynasty',
                meaning: '朝代',
                order: 10,
                partOfSpeech: 'n.',
                example: 'the Tang Dynasty',
                quiz: [
                  {
                    stem: '「dynasty」的意思是？',
                    options: ['朝代', '年份', '世纪', '国家'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'variety',
                meaning: '多样化；种类',
                order: 11,
                partOfSpeech: 'n.',
                example: 'a variety of',
                quiz: [
                  {
                    stem: '「variety」的意思是？',
                    options: ['多样化；种类', '单一', '相同', '重复'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'major',
                meaning: '主要的',
                order: 12,
                partOfSpeech: 'adj.',
                example: 'a major problem',
                quiz: [
                  {
                    stem: '「major」的意思是？',
                    options: ['主要的', '次要的', '微小的', '无关的'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'means',
                meaning: '方法；手段',
                order: 13,
                partOfSpeech: 'n.',
                example: 'a means of communication',
                quiz: [
                  {
                    stem: '「means」的意思是？',
                    options: ['方法；手段', '目的', '结果', '原因'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'classic',
                meaning: '经典的',
                order: 14,
                partOfSpeech: 'adj.',
                example: 'classic works',
                quiz: [
                  {
                    stem: '「classic」的意思是？',
                    options: ['经典的', '现代的', '流行的', '过时的'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'regard',
                meaning: '看待；认为',
                order: 15,
                partOfSpeech: 'v.',
                example: 'regard...as...',
                quiz: [
                  {
                    stem: '「regard...as...」的意思是？',
                    options: ['把…看作…', '拒绝', '忘记', '怀疑'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'specific',
                meaning: '具体的；特定的',
                order: 16,
                partOfSpeech: 'adj.',
                example: 'specific examples',
                quiz: [
                  {
                    stem: '「specific」的意思是？',
                    options: ['具体的；特定的', '笼统的', '模糊的', '随机的'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'struggle',
                meaning: '奋斗；挣扎',
                order: 17,
                partOfSpeech: 'v./n.',
                example: 'struggle to do sth',
                quiz: [
                  {
                    stem: '「struggle」的意思是？',
                    options: ['奋斗；挣扎', '放弃', '休息', '享受'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'tongue',
                meaning: '舌头；语言',
                order: 18,
                partOfSpeech: 'n.',
                example: 'mother tongue',
                quiz: [
                  {
                    stem: '「mother tongue」的意思是？',
                    options: ['母语', '外语', '方言', '口语'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'global',
                meaning: '全球的',
                order: 19,
                partOfSpeech: 'adj.',
                example: 'global communication',
                quiz: [
                  {
                    stem: '「global」的意思是？',
                    options: ['全球的', '局部的', '地区的', '国内的'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'appreciate',
                meaning: '欣赏；感激',
                order: 20,
                partOfSpeech: 'v.',
                example: 'appreciate your help',
                quiz: [
                  {
                    stem: '「appreciate」的意思是？',
                    options: ['欣赏；感激', '忽视', '厌恶', '怀疑'],
                    answerIndex: 0,
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
};
