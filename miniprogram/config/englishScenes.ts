// 英语「情景闯关」题库（**只放数据**，判定与流程在 core/scene.ts）。
//
// 与数学共用同一套数据结构和流程（core/scene.ts + pages/scene-quest*），只是内容换成
// 「在什么场合说什么话」。题型本身还是 4 选 1，判题按 answerIndex，**没有新增题型**。
//
// 为什么是情景而不是单词：单词在别的地方已经练得够多了（消消乐 / 听音找词 / 小蜜蜂），
// 缺的是「真到那个场合，这句话怎么说」。四选一里三个是中式英语或张冠李戴，
// 孩子要认出「哪一句是地道说法」——讲解里会点破错的那几句错在哪。
//
// 年级：英语从三年级起，所以只有 grade 3 / grade 5 两档（一二年级不开）。
// ⚠️ 动过这里就跑一遍 tests/sceneData.test.ts：它校验选项数量、answerIndex 合法、
//    每题 hint / explain 不为空，以及「不出现一二年级组」（英语从三年级起）。
import type { ScenePack } from '../core/scene';

export const ENGLISH_SCENE_PACKS: readonly ScenePack[] = [
  {
    id: 'order',
    subject: '英语',
    name: '餐厅点餐',
    icon: '🍔',
    desc: '从点单到结账，把最常用的一套话练熟',
    quests: [
      {
        id: 'order-3',
        name: '快餐店',
        grade: 3,
        story: 'You are in a fast food restaurant. The waiter smiles and says: "Can I help you?"',
        questions: [
          {
            stem: '服务员说 "Can I help you?" 你想点一个汉堡，应该怎么回答？',
            options: ["I'm fine.", "I'd like a hamburger.", "You're welcome.", 'Here you are.'],
            answerIndex: 1,
            hint: "点餐时说「我想要……」用 I would like，口语里缩写成 I'd like。",
            explain:
              "点餐的固定说法是 I'd like ...（我想要……）。I'm fine 是回答 How are you 的，You're welcome 是回答 Thank you 的。",
          },
          {
            stem: '服务员问 "Anything to drink?" 你想要牛奶，应该怎么说？',
            options: ['Yes, I am.', 'No, thanks.', 'Milk, please.', "It's milk."],
            answerIndex: 2,
            hint: '想要某样东西，直接说名称再加 please。',
            explain:
              'Milk, please. 意思是「请给我牛奶」。Yes, I am 用来回答 Are you ...? 开头的问句，这里对不上。',
          },
          {
            stem: '你想问这个汉堡多少钱，应该怎么问？',
            options: ['How much is it?', 'How old are you?', 'How are you?', 'What time is it?'],
            answerIndex: 0,
            hint: '问价格用 How much，问年龄用 How old。',
            explain:
              'How much is it? = 这个多少钱。How old 问年龄，How are you 问身体，What time 问时间。',
          },
          {
            stem: '服务员把食物递给你说 "Here you are." 你应该回答什么？',
            options: ["That's right.", 'Thank you.', 'You too.', 'See you.'],
            answerIndex: 1,
            hint: '别人把东西递给你，要道谢。',
            explain: '收到东西要说 Thank you.。Here you are 是「给你」，不是让你再对服务员说一遍。',
          },
        ],
      },
      {
        id: 'order-5',
        name: '家庭聚餐',
        grade: 5,
        story:
          'You are at a restaurant with your family. The waiter is waiting to take your order.',
        questions: [
          {
            stem: '服务员问 "Are you ready to order?" 你还没想好，应该怎么回答？',
            options: [
              'Yes, I do.',
              'Not yet, please wait a moment.',
              "I'm ready.",
              "No, I'm not hungry.",
            ],
            answerIndex: 1,
            hint: '还没准备好要说 Not yet（还没有）。',
            explain:
              "Not yet, please wait a moment. = 还没好，请稍等。说 No, I'm not hungry 会让人以为你不吃了。",
          },
          {
            stem: '你想告诉服务员「我不吃辣的」，应该怎么说？',
            options: ["I don't like spicy food.", 'I no spicy.', 'I not eat hot.', 'Spicy not me.'],
            answerIndex: 0,
            hint: "英语的否定要用助动词 don't，不能直接用 no / not。",
            explain:
              "I don't like spicy food. = 我不喜欢辣的食物。hot 指「热的」，说辣味要用 spicy。",
          },
          {
            stem: '你想问「这道菜里有鸡蛋吗？」，应该怎么问？',
            options: [
              'Is this egg?',
              'Does this dish have eggs in it?',
              'Has this dish egg?',
              'This dish egg?',
            ],
            answerIndex: 1,
            hint: '「有」用 have，一般现在时的疑问句要用 Do / Does 开头。',
            explain:
              'Does this dish have eggs in it? 是正确的一般疑问句。Is this egg? 意思变成「这是鸡蛋吗」。',
          },
          {
            stem: '吃完后你想说「很好吃」，应该怎么说？',
            options: ["It's very well.", "It's delicious.", "I'm delicious.", 'Very eat.'],
            answerIndex: 1,
            hint: '形容食物好吃用 delicious。',
            explain: "It's delicious. = 很好吃。说 I'm delicious 意思变成「我很好吃」，会闹笑话。",
          },
        ],
      },
    ],
  },
  {
    id: 'shopen',
    subject: '英语',
    name: '商店购物',
    icon: '🛍️',
    desc: '试穿、问价、成交，买东西要会说的几句话',
    quests: [
      {
        id: 'shopen-3',
        name: '买衣服',
        grade: 3,
        story: 'You are in a clothes shop. You want to buy a T-shirt.',
        questions: [
          {
            stem: '店员问 "Can I help you?" 你想说「我想看看那件 T 恤」，应该怎么回答？',
            options: [
              'I see T-shirt.',
              'I want to have a look at that T-shirt.',
              'That T-shirt.',
              'Look T-shirt.',
            ],
            answerIndex: 1,
            hint: '「看一看」是 have a look at，句子要有主语和动词。',
            explain:
              'I want to have a look at that T-shirt. = 我想看看那件 T 恤。只说 That T-shirt 不是一个完整的句子。',
          },
          {
            stem: '你想试穿这件 T 恤，应该怎么问？',
            options: ['Can I try it on?', 'I try.', 'Try me.', 'It can try?'],
            answerIndex: 0,
            hint: '「试穿」是 try on，代词 it 要放在 try 和 on 中间。',
            explain:
              'Can I try it on? = 我可以试穿吗？try on 是「试穿」，代词要放中间。Try me 意思变成「试试我」。',
          },
          {
            stem: '你想问「有小一点的吗？」，应该怎么问？',
            options: ['Have small?', 'Do you have a smaller size?', 'Small have?', 'Is small?'],
            answerIndex: 1,
            hint: '问「有没有」用 Do you have ...?',
            explain:
              'Do you have a smaller size? = 有小一点的尺码吗？「尺码」是 size，不能直接用 small。',
          },
          {
            stem: '你觉得太贵了，想说「太贵了」，应该怎么表达？',
            options: ["It's too expensive.", "It's much money.", 'Very money.', 'Too much cheap.'],
            answerIndex: 0,
            hint: '「贵」是 expensive，「便宜」是 cheap。',
            explain: "It's too expensive. = 太贵了。cheap 是便宜，说 too much cheap 就自相矛盾了。",
          },
        ],
      },
      {
        id: 'shopen-5',
        name: '挑礼物',
        grade: 5,
        story: 'You are buying a birthday gift for your mother in a shop.',
        questions: [
          {
            stem: '店员问你在找什么，你想说「我在给我妈妈买生日礼物」，怎么说？',
            options: [
              'I buy my mother birthday.',
              "I'm looking for a birthday gift for my mother.",
              'My mother gift birthday.',
              'I gift my mother.',
            ],
            answerIndex: 1,
            hint: '「正在找」用 look for，「给某人」用 for。',
            explain:
              "I'm looking for a birthday gift for my mother. = 我在给妈妈找生日礼物。gift 是名词，不能直接当动词用。",
          },
          {
            stem: '店员问 "What color does she like?" 你想回答「她喜欢蓝色」，怎么说？',
            options: ['She blue.', 'She likes blue.', 'Her like blue.', 'She is blue like.'],
            answerIndex: 1,
            hint: '第三人称单数的动词要加 -s，作主语用 She 不用 Her。',
            explain: 'She likes blue. = 她喜欢蓝色。主语用主格 She，第三人称单数动词要加 -s。',
          },
          {
            stem: '你想问「可以便宜一点吗？」，最有礼貌的说法是？',
            options: [
              'Cheap please?',
              'Can you give me a discount?',
              'More cheap?',
              'Cheaper you?',
            ],
            answerIndex: 1,
            hint: '「打折、优惠」是 discount。',
            explain:
              'Can you give me a discount? = 能给我打个折吗？直接说 Cheap please 听上去不太礼貌。',
          },
          {
            stem: '你决定买下这件礼物，应该怎么表达？',
            options: ['I take it.', "I'll take it.", 'I taking.', 'Take I.'],
            answerIndex: 1,
            hint: "决定买下来要用将来时 I will，口语里缩写成 I'll。",
            explain: "I'll take it. = 我要这件了。这是购物时决定买下最地道的说法。",
          },
        ],
      },
    ],
  },
  {
    id: 'askway',
    subject: '英语',
    name: '问路',
    icon: '🚕',
    desc: '问得出口、听得懂指路，还能给别人指一次',
    quests: [
      {
        id: 'askway-3',
        name: '找动物园',
        grade: 3,
        story: 'You are lost on the street. You want to go to the zoo.',
        questions: [
          {
            stem: '你想向路人问去动物园怎么走，最得体的说法是？',
            options: [
              'You tell me.',
              'Excuse me, how can I get to the zoo?',
              'Where you go?',
              'Hey, zoo?',
            ],
            answerIndex: 1,
            hint: '向陌生人问路要先说 Excuse me。',
            explain:
              'Excuse me, how can I get to the zoo? = 打扰一下，请问动物园怎么走？礼貌开场很重要。',
          },
          {
            stem: '路人说 "Go straight and turn left." 这句话的意思是？',
            options: ['直走然后左转', '直走然后右转', '左转再直走', '往回走'],
            answerIndex: 0,
            hint: 'straight 是「直」，left 是「左」。',
            explain: 'go straight = 直走，turn left = 左转。「右转」要说 turn right。',
          },
          {
            stem: '你想问「远吗？」，应该怎么问？',
            options: ['Is it far?', 'It is far?', 'Far it?', 'How far it?'],
            answerIndex: 0,
            hint: '疑问句要把 is 放在主语前面。',
            explain: 'Is it far? = 远吗？疑问句要把 be 动词提到主语前面。',
          },
          {
            stem: '路人给你指完路，你应该说什么？',
            options: ["That's OK.", 'Thank you very much.', 'Yes, please.', 'You go.'],
            answerIndex: 1,
            hint: '别人帮了你，要道谢。',
            explain: 'Thank you very much. = 非常感谢。得到帮助一定要说谢谢。',
          },
        ],
      },
      {
        id: 'askway-5',
        name: '给人指路',
        grade: 5,
        story: 'A visitor asks you the way to the train station. You want to help him.',
        questions: [
          {
            stem: '你想说「沿着这条街走，在第二个路口右转」，怎么说？',
            options: [
              'Go this street, two right.',
              'Go along this street and turn right at the second crossing.',
              'Along street, right two.',
              'Street go, right second.',
            ],
            answerIndex: 1,
            hint: '「沿着」是 along，「在……路口」用 at the ... crossing。',
            explain:
              'Go along this street and turn right at the second crossing. = 沿这条街走，第二个路口右转。',
          },
          {
            stem: '你想说「它就在银行旁边」，怎么说？',
            options: [
              'It bank near.',
              "It's next to the bank.",
              'It near bank is.',
              'Bank it next.',
            ],
            answerIndex: 1,
            hint: '「在……旁边」是 next to。',
            explain:
              "It's next to the bank. = 它在银行旁边。near 是「在附近」，句子里也要有谓语动词 is。",
          },
          {
            stem: '对方问 "How long does it take to walk there?" 你想回答「大约十分钟」，怎么说？',
            options: [
              'Ten minutes about.',
              'It takes about ten minutes.',
              'About it ten minutes.',
              'Ten minutes take.',
            ],
            answerIndex: 1,
            hint: '「花费时间」用 It takes ...',
            explain: 'It takes about ten minutes. = 大约要花十分钟。about 放在数量前面。',
          },
          {
            stem: '你想告诉他「你可以坐 5 路公交车」，怎么说？',
            options: [
              'You can take the No. 5 bus.',
              'You take bus 5 can.',
              'Bus 5 you by.',
              'Take you bus five.',
            ],
            answerIndex: 0,
            hint: '「乘坐公交车」用 take the bus，情态动词 can 后面接动词原形。',
            explain:
              'You can take the No. 5 bus. = 你可以坐 5 路公交车。No. 5 读作 the number five。',
          },
        ],
      },
    ],
  },
  {
    id: 'doctor',
    subject: '英语',
    name: '看医生',
    icon: '🏥',
    desc: '说清症状、听懂医嘱，医院里不再干着急',
    quests: [
      {
        id: 'doctor-3',
        name: '我生病了',
        grade: 3,
        story: "You don't feel well today. Your mother takes you to see the doctor.",
        questions: [
          {
            stem: '医生问 "What\'s wrong with you?" 你想说「我头疼」，怎么说？',
            options: ['My head wrong.', 'I have a headache.', 'I head hurt.', 'Head me ache.'],
            answerIndex: 1,
            hint: '「头疼」的固定说法是 have a headache。',
            explain:
              'I have a headache. = 我头疼。同样的说法还有 have a cold（感冒）、have a fever（发烧）。',
          },
          {
            stem: '医生问 "Do you have a fever?" 你想回答「是的，我发烧了」，怎么说？',
            options: ['Yes, I have.', 'Yes, I do.', 'Yes, I am.', 'Yes, fever.'],
            answerIndex: 1,
            hint: '用 Do 开头的问句，回答也要用 do。',
            explain: 'Do you ...? 的肯定回答是 Yes, I do.。问句用什么助动词，答句就用什么。',
          },
          {
            stem: '医生说 "Take this medicine three times a day." 这句话的意思是？',
            options: ['一天吃三次', '一天吃三片', '三天吃一次', '一次吃三片'],
            answerIndex: 0,
            hint: 'three times 是「三次」，a day 是「一天」。',
            explain: 'three times a day = 一天三次。这是医生最常见的医嘱说法之一。',
          },
          {
            stem: '看完病离开时，你应该对医生说什么？',
            options: ['Good luck.', 'Thank you, doctor.', 'Well done.', 'Excuse me.'],
            answerIndex: 1,
            hint: '看完病要向医生道谢。',
            explain:
              'Thank you, doctor. = 谢谢您，医生。Good luck 是祝人好运，Well done 是夸人做得好。',
          },
        ],
      },
      {
        id: 'doctor-5',
        name: '陪朋友看病',
        grade: 5,
        story:
          'Your friend Tom is ill. You take him to the doctor. The doctor is asking questions.',
        questions: [
          {
            stem: '医生问 "How long have you been like this?" 你想回答「两天了」，怎么说？',
            options: ['Two days ago.', 'For two days.', 'In two days.', 'Two days long.'],
            answerIndex: 1,
            hint: '「持续了多久」用 for 加一段时间。',
            explain:
              'For two days. = 已经两天了。Two days ago 是「两天前（发生过一次）」，In two days 是「两天后」。',
          },
          {
            stem: '医生问 "Do you have any allergies?" 医生是在问什么？',
            options: ['你有过敏吗？', '你吃药了吗？', '你吃饭了吗？', '你咳嗽吗？'],
            answerIndex: 0,
            hint: 'allergy 是「过敏」。',
            explain: 'allergy = 过敏，allergies 是复数。医生开药前必须确认病人有没有过敏。',
          },
          {
            stem: '医生说 "You should stay in bed and drink more water." 你应该怎么做？',
            options: ['多做运动', '卧床休息并多喝水', '照常去上学', '吃辛辣的食物'],
            answerIndex: 1,
            hint: 'stay in bed 是「卧床」，drink more water 是「多喝水」。',
            explain:
              'stay in bed = 卧床休息，drink more water = 多喝水。should 后面直接加动词原形。',
          },
          {
            stem: '你想问医生「我什么时候能好起来？」，怎么说？',
            options: ['When I good?', 'When can I get better?', 'How I better?', 'What time good?'],
            answerIndex: 1,
            hint: '「好起来」是 get better，特殊疑问句要把 can 放在主语前面。',
            explain: 'When can I get better? = 我什么时候能好？get better = 好转、康复。',
          },
        ],
      },
    ],
  },
];
