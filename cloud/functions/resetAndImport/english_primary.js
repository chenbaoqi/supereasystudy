// 英语 PEP 一起版 2024 —— 一、二年级词汇（2026-09-30 补齐低年级教材）。
// 低年级以听说为主：词汇简单、每词配 1 道词义选择题；发音走 TTS（ pronunciationService.speak ）。
// 由 scripts/add_english_primary.js 挂到英语「词汇」路径下，作为独立教材「人教版PEP一起 2024」。
module.exports = {
  textbook: {
    name: '人教版PEP一起 2024',
    order: 2,
    curriculumVersion: '人教版2024',
    semesters: [
      {
        name: '一年级上册',
        order: 1,
        grade: 1,
        stage: 'primary',
        chapters: [
          {
            title: 'Unit 1 Hello!',
            order: 1,
            knowledge: [
              {
                word: 'hello',
                meaning: '你好（打招呼）',
                order: 1,
                partOfSpeech: 'int.',
                example: 'Hello! I am Li Ming.',
                quiz: [
                  {
                    stem: '「hello」的意思是？',
                    options: ['你好', '再见', '谢谢', '对不起'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'hi',
                meaning: '嗨（更随意的打招呼）',
                order: 2,
                partOfSpeech: 'int.',
                example: 'Hi, Lucy!',
                quiz: [
                  {
                    stem: '「hi」的意思是？',
                    options: ['嗨', '再见', '好的', '请'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'goodbye',
                meaning: '再见',
                order: 3,
                partOfSpeech: 'int.',
                example: 'Goodbye, Miss Li!',
                quiz: [
                  {
                    stem: '「goodbye」的意思是？',
                    options: ['再见', '你好', '早上好', '晚安'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'bye-bye',
                meaning: '拜拜（再见的口语）',
                order: 4,
                partOfSpeech: 'int.',
                example: 'Bye-bye, mum!',
                quiz: [
                  {
                    stem: '「bye-bye」的意思是？',
                    options: ['拜拜', '你好', '请进', '谢谢'],
                    answerIndex: 0,
                  },
                ],
              },
            ],
          },
          {
            title: 'Unit 2 My first class',
            order: 2,
            knowledge: [
              {
                word: 'school',
                meaning: '学校',
                order: 1,
                partOfSpeech: 'n.',
                example: 'I go to school.',
                quiz: [
                  {
                    stem: '「school」的意思是？',
                    options: ['学校', '书包', '书', '老师'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'class',
                meaning: '班级；课堂',
                order: 2,
                partOfSpeech: 'n.',
                example: 'This is my class.',
                quiz: [
                  {
                    stem: '「class」的意思是？',
                    options: ['班级', '操场', '家', '公园'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'book',
                meaning: '书',
                order: 3,
                partOfSpeech: 'n.',
                example: 'This is my book.',
                quiz: [
                  { stem: '「book」的意思是？', options: ['书', '笔', '包', '桌'], answerIndex: 0 },
                ],
              },
              {
                word: 'bag',
                meaning: '书包',
                order: 4,
                partOfSpeech: 'n.',
                example: 'My bag is new.',
                quiz: [
                  {
                    stem: '「bag」的意思是？',
                    options: ['书包', '书', '笔', '球'],
                    answerIndex: 0,
                  },
                ],
              },
            ],
          },
          {
            title: 'Unit 3 Look, listen and learn',
            order: 3,
            knowledge: [
              {
                word: 'eye',
                meaning: '眼睛',
                order: 1,
                partOfSpeech: 'n.',
                example: 'This is my eye.',
                quiz: [
                  {
                    stem: '「eye」的意思是？',
                    options: ['眼睛', '耳朵', '鼻子', '嘴巴'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'ear',
                meaning: '耳朵',
                order: 2,
                partOfSpeech: 'n.',
                example: 'I have two ears.',
                quiz: [
                  {
                    stem: '「ear」的意思是？',
                    options: ['耳朵', '眼睛', '手', '脚'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'nose',
                meaning: '鼻子',
                order: 3,
                partOfSpeech: 'n.',
                example: 'Touch my nose.',
                quiz: [
                  {
                    stem: '「nose」的意思是？',
                    options: ['鼻子', '眼睛', '耳朵', '嘴巴'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'mouth',
                meaning: '嘴巴',
                order: 4,
                partOfSpeech: 'n.',
                example: 'Open your mouth.',
                quiz: [
                  {
                    stem: '「mouth」的意思是？',
                    options: ['嘴巴', '鼻子', '眼睛', '手'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'hand',
                meaning: '手',
                order: 5,
                partOfSpeech: 'n.',
                example: 'Clap your hands.',
                quiz: [
                  { stem: '「hand」的意思是？', options: ['手', '脚', '头', '腿'], answerIndex: 0 },
                ],
              },
            ],
          },
          {
            title: 'Unit 4 Ready for school',
            order: 4,
            knowledge: [
              {
                word: 'pen',
                meaning: '钢笔',
                order: 1,
                partOfSpeech: 'n.',
                example: 'This is my pen.',
                quiz: [
                  {
                    stem: '「pen」的意思是？',
                    options: ['钢笔', '铅笔', '书', '尺子'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'pencil',
                meaning: '铅笔',
                order: 2,
                partOfSpeech: 'n.',
                example: 'I have a pencil.',
                quiz: [
                  {
                    stem: '「pencil」的意思是？',
                    options: ['铅笔', '钢笔', '橡皮', '书包'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'ruler',
                meaning: '尺子',
                order: 3,
                partOfSpeech: 'n.',
                example: 'Show me your ruler.',
                quiz: [
                  {
                    stem: '「ruler」的意思是？',
                    options: ['尺子', '铅笔', '书', '包'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'eraser',
                meaning: '橡皮',
                order: 4,
                partOfSpeech: 'n.',
                example: 'This is an eraser.',
                quiz: [
                  {
                    stem: '「eraser」的意思是？',
                    options: ['橡皮', '尺子', '钢笔', '铅笔'],
                    answerIndex: 0,
                  },
                ],
              },
            ],
          },
          {
            title: 'Unit 5 People around me',
            order: 5,
            knowledge: [
              {
                word: 'teacher',
                meaning: '老师',
                order: 1,
                partOfSpeech: 'n.',
                example: 'She is my teacher.',
                quiz: [
                  {
                    stem: '「teacher」的意思是？',
                    options: ['老师', '学生', '医生', '妈妈'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'friend',
                meaning: '朋友',
                order: 2,
                partOfSpeech: 'n.',
                example: 'We are friends.',
                quiz: [
                  {
                    stem: '「friend」的意思是？',
                    options: ['朋友', '老师', '家人', '同学'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'pupil',
                meaning: '小学生',
                order: 3,
                partOfSpeech: 'n.',
                example: 'I am a pupil.',
                quiz: [
                  {
                    stem: '「pupil」的意思是？',
                    options: ['小学生', '老师', '爸爸', '叔叔'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'classmate',
                meaning: '同学',
                order: 4,
                partOfSpeech: 'n.',
                example: 'He is my classmate.',
                quiz: [
                  {
                    stem: '「classmate」的意思是？',
                    options: ['同学', '老师', '朋友', '家人'],
                    answerIndex: 0,
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        name: '一年级下册',
        order: 2,
        grade: 1,
        stage: 'primary',
        chapters: [
          {
            title: 'Unit 1 Nice boys and girls',
            order: 1,
            knowledge: [
              {
                word: 'boy',
                meaning: '男孩',
                order: 1,
                partOfSpeech: 'n.',
                example: 'He is a boy.',
                quiz: [
                  {
                    stem: '「boy」的意思是？',
                    options: ['男孩', '女孩', '男人', '老师'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'girl',
                meaning: '女孩',
                order: 2,
                partOfSpeech: 'n.',
                example: 'She is a girl.',
                quiz: [
                  {
                    stem: '「girl」的意思是？',
                    options: ['女孩', '男孩', '女人', '学生'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'nice',
                meaning: '好的；愉快的',
                order: 3,
                partOfSpeech: 'adj.',
                example: 'Nice to meet you.',
                quiz: [
                  {
                    stem: '「Nice to meet you.」的意思是？',
                    options: ['见到你很高兴', '再见', '你好吗', '谢谢'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'meet',
                meaning: '遇见',
                order: 4,
                partOfSpeech: 'v.',
                example: 'I meet my friend.',
                quiz: [
                  {
                    stem: '「meet」的意思是？',
                    options: ['遇见', '告别', '吃饭', '睡觉'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'too',
                meaning: '也',
                order: 5,
                partOfSpeech: 'adv.',
                example: 'Nice to meet you, too.',
                quiz: [
                  {
                    stem: '「too」的意思是？',
                    options: ['也', '两个', '到', '太好了'],
                    answerIndex: 0,
                  },
                ],
              },
            ],
          },
          {
            title: 'Unit 2 My family',
            order: 2,
            knowledge: [
              {
                word: 'mum',
                meaning: '妈妈（口语）',
                order: 1,
                partOfSpeech: 'n.',
                example: 'This is my mum.',
                quiz: [
                  {
                    stem: '「mum」的意思是？',
                    options: ['妈妈', '爸爸', '老师', '姐妹'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'dad',
                meaning: '爸爸（口语）',
                order: 2,
                partOfSpeech: 'n.',
                example: 'This is my dad.',
                quiz: [
                  {
                    stem: '「dad」的意思是？',
                    options: ['爸爸', '妈妈', '兄弟', '爷爷'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'family',
                meaning: '家庭',
                order: 3,
                partOfSpeech: 'n.',
                example: 'I love my family.',
                quiz: [
                  {
                    stem: '「family」的意思是？',
                    options: ['家庭', '学校', '朋友', '教室'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'love',
                meaning: '爱',
                order: 4,
                partOfSpeech: 'v.',
                example: 'I love my mum.',
                quiz: [
                  {
                    stem: '「love」的意思是？',
                    options: ['爱', '喜欢吃饭', '跑步', '睡觉'],
                    answerIndex: 0,
                  },
                ],
              },
            ],
          },
          {
            title: 'Unit 3 Animal friends',
            order: 3,
            knowledge: [
              {
                word: 'cat',
                meaning: '猫',
                order: 1,
                partOfSpeech: 'n.',
                example: 'The cat is small.',
                quiz: [
                  { stem: '「cat」的意思是？', options: ['猫', '狗', '鸟', '鱼'], answerIndex: 0 },
                ],
              },
              {
                word: 'dog',
                meaning: '狗',
                order: 2,
                partOfSpeech: 'n.',
                example: 'The dog is big.',
                quiz: [
                  {
                    stem: '「dog」的意思是？',
                    options: ['狗', '猫', '鸟', '老虎'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'bird',
                meaning: '鸟',
                order: 3,
                partOfSpeech: 'n.',
                example: 'The bird can fly.',
                quiz: [
                  { stem: '「bird」的意思是？', options: ['鸟', '鱼', '猫', '狗'], answerIndex: 0 },
                ],
              },
              {
                word: 'fish',
                meaning: '鱼',
                order: 4,
                partOfSpeech: 'n.',
                example: 'The fish can swim.',
                quiz: [
                  {
                    stem: '「fish」的意思是？',
                    options: ['鱼', '鸟', '猫', '鸭子'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'panda',
                meaning: '熊猫',
                order: 5,
                partOfSpeech: 'n.',
                example: 'I like the panda.',
                quiz: [
                  {
                    stem: '「panda」的意思是？',
                    options: ['熊猫', '猴子', '老虎', '大象'],
                    answerIndex: 0,
                  },
                ],
              },
            ],
          },
          {
            title: 'Unit 4 Yummy fruit',
            order: 4,
            knowledge: [
              {
                word: 'apple',
                meaning: '苹果',
                order: 1,
                partOfSpeech: 'n.',
                example: 'I have an apple.',
                quiz: [
                  {
                    stem: '「apple」的意思是？',
                    options: ['苹果', '香蕉', '橘子', '梨'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'banana',
                meaning: '香蕉',
                order: 2,
                partOfSpeech: 'n.',
                example: 'The banana is yellow.',
                quiz: [
                  {
                    stem: '「banana」的意思是？',
                    options: ['香蕉', '苹果', '橘子', '葡萄'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'orange',
                meaning: '橘子',
                order: 3,
                partOfSpeech: 'n.',
                example: 'This is an orange.',
                quiz: [
                  {
                    stem: '「orange」的意思是？',
                    options: ['橘子', '苹果', '香蕉', '桃子'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'pear',
                meaning: '梨',
                order: 4,
                partOfSpeech: 'n.',
                example: 'The pear is sweet.',
                quiz: [
                  {
                    stem: '「pear」的意思是？',
                    options: ['梨', '苹果', '香蕉', '西瓜'],
                    answerIndex: 0,
                  },
                ],
              },
            ],
          },
          {
            title: 'Unit 5 In the zoo',
            order: 5,
            knowledge: [
              {
                word: 'zoo',
                meaning: '动物园',
                order: 1,
                partOfSpeech: 'n.',
                example: "Let's go to the zoo.",
                quiz: [
                  {
                    stem: '「zoo」的意思是？',
                    options: ['动物园', '公园', '学校', '家'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'tiger',
                meaning: '老虎',
                order: 2,
                partOfSpeech: 'n.',
                example: 'The tiger is strong.',
                quiz: [
                  {
                    stem: '「tiger」的意思是？',
                    options: ['老虎', '狮子', '熊猫', '猴子'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'monkey',
                meaning: '猴子',
                order: 3,
                partOfSpeech: 'n.',
                example: 'The monkey is funny.',
                quiz: [
                  {
                    stem: '「monkey」的意思是？',
                    options: ['猴子', '老虎', '大象', '熊猫'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'elephant',
                meaning: '大象',
                order: 4,
                partOfSpeech: 'n.',
                example: 'The elephant is big.',
                quiz: [
                  {
                    stem: '「elephant」的意思是？',
                    options: ['大象', '猴子', '老虎', '鸟'],
                    answerIndex: 0,
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        name: '二年级上册',
        order: 3,
        grade: 2,
        stage: 'primary',
        chapters: [
          {
            title: 'Unit 1 Numbers',
            order: 1,
            knowledge: [
              {
                word: 'one',
                meaning: '一',
                order: 1,
                partOfSpeech: 'num.',
                example: 'I have one apple.',
                quiz: [
                  { stem: '「one」的意思是？', options: ['一', '二', '三', '十'], answerIndex: 0 },
                ],
              },
              {
                word: 'two',
                meaning: '二',
                order: 2,
                partOfSpeech: 'num.',
                example: 'Two books.',
                quiz: [
                  { stem: '「two」的意思是？', options: ['二', '一', '三', '四'], answerIndex: 0 },
                ],
              },
              {
                word: 'three',
                meaning: '三',
                order: 3,
                partOfSpeech: 'num.',
                example: 'Three cats.',
                quiz: [
                  {
                    stem: '「three」的意思是？',
                    options: ['三', '二', '四', '五'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'four',
                meaning: '四',
                order: 4,
                partOfSpeech: 'num.',
                example: 'Four pens.',
                quiz: [
                  { stem: '「four」的意思是？', options: ['四', '三', '五', '六'], answerIndex: 0 },
                ],
              },
              {
                word: 'five',
                meaning: '五',
                order: 5,
                partOfSpeech: 'num.',
                example: 'Five birds.',
                quiz: [
                  { stem: '「five」的意思是？', options: ['五', '四', '六', '七'], answerIndex: 0 },
                ],
              },
              {
                word: 'six',
                meaning: '六',
                order: 6,
                partOfSpeech: 'num.',
                example: 'Six dogs.',
                quiz: [
                  { stem: '「six」的意思是？', options: ['六', '五', '七', '八'], answerIndex: 0 },
                ],
              },
              {
                word: 'seven',
                meaning: '七',
                order: 7,
                partOfSpeech: 'num.',
                example: 'Seven books.',
                quiz: [
                  {
                    stem: '「seven」的意思是？',
                    options: ['七', '六', '八', '九'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'eight',
                meaning: '八',
                order: 8,
                partOfSpeech: 'num.',
                example: 'Eight bags.',
                quiz: [
                  {
                    stem: '「eight」的意思是？',
                    options: ['八', '七', '九', '十'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'nine',
                meaning: '九',
                order: 9,
                partOfSpeech: 'num.',
                example: 'Nine cats.',
                quiz: [
                  { stem: '「nine」的意思是？', options: ['九', '八', '十', '七'], answerIndex: 0 },
                ],
              },
              {
                word: 'ten',
                meaning: '十',
                order: 10,
                partOfSpeech: 'num.',
                example: 'Ten pupils.',
                quiz: [
                  { stem: '「ten」的意思是？', options: ['十', '九', '八', '一'], answerIndex: 0 },
                ],
              },
            ],
          },
          {
            title: 'Unit 2 Colours',
            order: 2,
            knowledge: [
              {
                word: 'red',
                meaning: '红色',
                order: 1,
                partOfSpeech: 'n./adj.',
                example: 'The apple is red.',
                quiz: [
                  {
                    stem: '「red」的意思是？',
                    options: ['红色', '绿色', '蓝色', '黄色'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'green',
                meaning: '绿色',
                order: 2,
                partOfSpeech: 'n./adj.',
                example: 'The tree is green.',
                quiz: [
                  {
                    stem: '「green」的意思是？',
                    options: ['绿色', '红色', '黄色', '棕色'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'blue',
                meaning: '蓝色',
                order: 3,
                partOfSpeech: 'n./adj.',
                example: 'The sky is blue.',
                quiz: [
                  {
                    stem: '「blue」的意思是？',
                    options: ['蓝色', '绿色', '红色', '白色'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'yellow',
                meaning: '黄色',
                order: 4,
                partOfSpeech: 'n./adj.',
                example: 'The banana is yellow.',
                quiz: [
                  {
                    stem: '「yellow」的意思是？',
                    options: ['黄色', '蓝色', '红色', '橙色'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'orange',
                meaning: '橙红色',
                order: 5,
                partOfSpeech: 'n./adj.',
                example: 'The ball is orange.',
                quiz: [
                  {
                    stem: '「orange」表示颜色时的意思是？',
                    options: ['橙红色', '黄色', '绿色', '棕色'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'brown',
                meaning: '棕色',
                order: 6,
                partOfSpeech: 'n./adj.',
                example: 'The dog is brown.',
                quiz: [
                  {
                    stem: '「brown」的意思是？',
                    options: ['棕色', '黑色', '白色', '蓝色'],
                    answerIndex: 0,
                  },
                ],
              },
            ],
          },
          {
            title: 'Unit 3 In the classroom',
            order: 3,
            knowledge: [
              {
                word: 'clean',
                meaning: '打扫；干净的',
                order: 1,
                partOfSpeech: 'v./adj.',
                example: 'Clean the desk, please.',
                quiz: [
                  {
                    stem: '「clean」作动词的意思是？',
                    options: ['打扫', '吃饭', '睡觉', '跑步'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'floor',
                meaning: '地面',
                order: 2,
                partOfSpeech: 'n.',
                example: 'The floor is clean.',
                quiz: [
                  {
                    stem: '「floor」的意思是？',
                    options: ['地面', '桌子', '墙', '门'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'table',
                meaning: '桌子',
                order: 3,
                partOfSpeech: 'n.',
                example: 'The book is on the table.',
                quiz: [
                  {
                    stem: '「table」的意思是？',
                    options: ['桌子', '椅子', '门', '窗'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'feed',
                meaning: '喂养',
                order: 4,
                partOfSpeech: 'v.',
                example: 'Feed the cat, please.',
                quiz: [
                  {
                    stem: '「feed」的意思是？',
                    options: ['喂养', '打扫', '读书', '睡觉'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'help',
                meaning: '帮助',
                order: 5,
                partOfSpeech: 'v.',
                example: 'Let me help you.',
                quiz: [
                  {
                    stem: '「help」的意思是？',
                    options: ['帮助', '打扫', '看见', '听见'],
                    answerIndex: 0,
                  },
                ],
              },
            ],
          },
          {
            title: 'Unit 4 Feelings',
            order: 4,
            knowledge: [
              {
                word: 'happy',
                meaning: '高兴的',
                order: 1,
                partOfSpeech: 'adj.',
                example: 'I am happy.',
                quiz: [
                  {
                    stem: '「happy」的意思是？',
                    options: ['高兴的', '难过的', '生气的', '累的'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'sad',
                meaning: '难过的',
                order: 2,
                partOfSpeech: 'adj.',
                example: 'She is sad.',
                quiz: [
                  {
                    stem: '「sad」的意思是？',
                    options: ['难过的', '高兴的', '饿的', '累的'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'angry',
                meaning: '生气的',
                order: 3,
                partOfSpeech: 'adj.',
                example: 'Dad is angry.',
                quiz: [
                  {
                    stem: '「angry」的意思是？',
                    options: ['生气的', '高兴的', '饱的', '困的'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'hungry',
                meaning: '饿的',
                order: 4,
                partOfSpeech: 'adj.',
                example: 'I am hungry.',
                quiz: [
                  {
                    stem: '「hungry」的意思是？',
                    options: ['饿的', '饱的', '高兴的', '累的'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'tired',
                meaning: '疲劳的',
                order: 5,
                partOfSpeech: 'adj.',
                example: 'He is tired.',
                quiz: [
                  {
                    stem: '「tired」的意思是？',
                    options: ['疲劳的', '饿的', '开心的', '生气的'],
                    answerIndex: 0,
                  },
                ],
              },
            ],
          },
          {
            title: 'Unit 5 Toys',
            order: 5,
            knowledge: [
              {
                word: 'toy',
                meaning: '玩具',
                order: 1,
                partOfSpeech: 'n.',
                example: 'I have a toy.',
                quiz: [
                  {
                    stem: '「toy」的意思是？',
                    options: ['玩具', '书', '球', '车'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'car',
                meaning: '汽车',
                order: 2,
                partOfSpeech: 'n.',
                example: 'The car is red.',
                quiz: [
                  {
                    stem: '「car」的意思是？',
                    options: ['汽车', '球', '船', '娃娃'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'doll',
                meaning: '玩偶',
                order: 3,
                partOfSpeech: 'n.',
                example: 'The doll is pretty.',
                quiz: [
                  {
                    stem: '「doll」的意思是？',
                    options: ['玩偶', '汽车', '球', '船'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'ball',
                meaning: '球',
                order: 4,
                partOfSpeech: 'n.',
                example: 'I have a ball.',
                quiz: [
                  {
                    stem: '「ball」的意思是？',
                    options: ['球', '车', '玩具', '桌子'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'boat',
                meaning: '小船',
                order: 5,
                partOfSpeech: 'n.',
                example: 'The boat is small.',
                quiz: [
                  {
                    stem: '「boat」的意思是？',
                    options: ['小船', '汽车', '飞机', '火车'],
                    answerIndex: 0,
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        name: '二年级下册',
        order: 4,
        grade: 2,
        stage: 'primary',
        chapters: [
          {
            title: 'Unit 1 Food and drinks',
            order: 1,
            knowledge: [
              {
                word: 'rice',
                meaning: '米饭',
                order: 1,
                partOfSpeech: 'n.',
                example: 'I like rice.',
                quiz: [
                  {
                    stem: '「rice」的意思是？',
                    options: ['米饭', '面条', '鸡蛋', '牛奶'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'noodles',
                meaning: '面条',
                order: 2,
                partOfSpeech: 'n.',
                example: 'I like noodles.',
                quiz: [
                  {
                    stem: '「noodles」的意思是？',
                    options: ['面条', '米饭', '鸡蛋', '果汁'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'egg',
                meaning: '鸡蛋',
                order: 3,
                partOfSpeech: 'n.',
                example: 'I have an egg.',
                quiz: [
                  {
                    stem: '「egg」的意思是？',
                    options: ['鸡蛋', '米饭', '牛奶', '水'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'milk',
                meaning: '牛奶',
                order: 4,
                partOfSpeech: 'n.',
                example: 'Drink some milk.',
                quiz: [
                  {
                    stem: '「milk」的意思是？',
                    options: ['牛奶', '果汁', '水', '面条'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'water',
                meaning: '水',
                order: 5,
                partOfSpeech: 'n.',
                example: 'Drink more water.',
                quiz: [
                  {
                    stem: '「water」的意思是？',
                    options: ['水', '牛奶', '果汁', '鸡蛋'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'juice',
                meaning: '果汁',
                order: 6,
                partOfSpeech: 'n.',
                example: 'I like juice.',
                quiz: [
                  {
                    stem: '「juice」的意思是？',
                    options: ['果汁', '水', '牛奶', '米饭'],
                    answerIndex: 0,
                  },
                ],
              },
            ],
          },
          {
            title: 'Unit 2 Weather',
            order: 2,
            knowledge: [
              {
                word: 'sunny',
                meaning: '晴朗的',
                order: 1,
                partOfSpeech: 'adj.',
                example: 'It is sunny today.',
                quiz: [
                  {
                    stem: '「sunny」的意思是？',
                    options: ['晴朗的', '下雨的', '多云的', '刮风的'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'rainy',
                meaning: '下雨的',
                order: 2,
                partOfSpeech: 'adj.',
                example: 'It is rainy.',
                quiz: [
                  {
                    stem: '「rainy」的意思是？',
                    options: ['下雨的', '晴朗的', '下雪的', '多云的'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'cloudy',
                meaning: '多云的',
                order: 3,
                partOfSpeech: 'adj.',
                example: 'It is cloudy.',
                quiz: [
                  {
                    stem: '「cloudy」的意思是？',
                    options: ['多云的', '晴朗的', '下雨的', '刮风的'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'windy',
                meaning: '刮风的',
                order: 4,
                partOfSpeech: 'adj.',
                example: 'It is windy today.',
                quiz: [
                  {
                    stem: '「windy」的意思是？',
                    options: ['刮风的', '下雪的', '晴朗的', '下雨的'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'snowy',
                meaning: '下雪的',
                order: 5,
                partOfSpeech: 'adj.',
                example: 'It is snowy.',
                quiz: [
                  {
                    stem: '「snowy」的意思是？',
                    options: ['下雪的', '下雨的', '多云的', '晴朗的'],
                    answerIndex: 0,
                  },
                ],
              },
            ],
          },
          {
            title: 'Unit 3 Clothes',
            order: 3,
            knowledge: [
              {
                word: 'shirt',
                meaning: '衬衫',
                order: 1,
                partOfSpeech: 'n.',
                example: 'This is my shirt.',
                quiz: [
                  {
                    stem: '「shirt」的意思是？',
                    options: ['衬衫', '连衣裙', '帽子', '鞋'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'dress',
                meaning: '连衣裙',
                order: 2,
                partOfSpeech: 'n.',
                example: 'The dress is pretty.',
                quiz: [
                  {
                    stem: '「dress」的意思是？',
                    options: ['连衣裙', '衬衫', '外套', '帽子'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'hat',
                meaning: '帽子',
                order: 3,
                partOfSpeech: 'n.',
                example: 'I have a hat.',
                quiz: [
                  {
                    stem: '「hat」的意思是？',
                    options: ['帽子', '衬衫', '鞋', '裙子'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'shoes',
                meaning: '鞋',
                order: 4,
                partOfSpeech: 'n.',
                example: 'My shoes are new.',
                quiz: [
                  {
                    stem: '「shoes」的意思是？',
                    options: ['鞋', '帽子', '外套', '连衣裙'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'coat',
                meaning: '外套',
                order: 5,
                partOfSpeech: 'n.',
                example: 'Put on your coat.',
                quiz: [
                  {
                    stem: '「coat」的意思是？',
                    options: ['外套', '衬衫', '帽子', '鞋'],
                    answerIndex: 0,
                  },
                ],
              },
            ],
          },
          {
            title: 'Unit 4 Actions',
            order: 4,
            knowledge: [
              {
                word: 'run',
                meaning: '跑',
                order: 1,
                partOfSpeech: 'v.',
                example: 'I can run.',
                quiz: [
                  {
                    stem: '「run」的意思是？',
                    options: ['跑', '跳', '游泳', '唱歌'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'jump',
                meaning: '跳',
                order: 2,
                partOfSpeech: 'v.',
                example: 'The rabbit can jump.',
                quiz: [
                  { stem: '「jump」的意思是？', options: ['跳', '跑', '游', '飞'], answerIndex: 0 },
                ],
              },
              {
                word: 'swim',
                meaning: '游泳',
                order: 3,
                partOfSpeech: 'v.',
                example: 'Fish can swim.',
                quiz: [
                  {
                    stem: '「swim」的意思是？',
                    options: ['游泳', '跑步', '唱歌', '跳舞'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'sing',
                meaning: '唱歌',
                order: 4,
                partOfSpeech: 'v.',
                example: 'Let us sing.',
                quiz: [
                  {
                    stem: '「sing」的意思是？',
                    options: ['唱歌', '跳舞', '画画', '读书'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'dance',
                meaning: '跳舞',
                order: 5,
                partOfSpeech: 'v.',
                example: 'She can dance.',
                quiz: [
                  {
                    stem: '「dance」的意思是？',
                    options: ['跳舞', '唱歌', '跑步', '游泳'],
                    answerIndex: 0,
                  },
                ],
              },
            ],
          },
          {
            title: 'Unit 5 Body',
            order: 5,
            knowledge: [
              {
                word: 'head',
                meaning: '头',
                order: 1,
                partOfSpeech: 'n.',
                example: 'This is my head.',
                quiz: [
                  {
                    stem: '「head」的意思是？',
                    options: ['头', '头发', '胳膊', '腿'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'hair',
                meaning: '头发',
                order: 2,
                partOfSpeech: 'n.',
                example: 'Her hair is long.',
                quiz: [
                  {
                    stem: '「hair」的意思是？',
                    options: ['头发', '头', '手', '脚'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'arm',
                meaning: '胳膊',
                order: 3,
                partOfSpeech: 'n.',
                example: 'My arm is long.',
                quiz: [
                  {
                    stem: '「arm」的意思是？',
                    options: ['胳膊', '腿', '头', '脚'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'leg',
                meaning: '腿',
                order: 4,
                partOfSpeech: 'n.',
                example: 'I have two legs.',
                quiz: [
                  {
                    stem: '「leg」的意思是？',
                    options: ['腿', '胳膊', '头', '手'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: 'foot',
                meaning: '脚',
                order: 5,
                partOfSpeech: 'n.',
                example: 'My foot is big.',
                quiz: [
                  { stem: '「foot」的意思是？', options: ['脚', '腿', '手', '头'], answerIndex: 0 },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
};
