// 教材数据文件（由 scripts/convert_textbook.mjs 自动生成，请勿手改）
module.exports = {
  subjects: [
    {
      name: '英语',
      open: true,
      order: 1,
    },
  ],
  trees: {
    英语: {
      learningPaths: [
        {
          name: '词汇',
          open: true,
          order: 1,
          textbooks: [
            {
              name: '人教版 PEP',
              order: 1,
              semesters: [
                {
                  name: '七年级上册',
                  order: 1,
                  chapters: [
                    {
                      title: 'Unit 1',
                      order: 1,
                      knowledge: [
                        {
                          word: 'hello',
                          meaning: '你好',
                          order: 1,
                          ipa: 'həˈləʊ',
                          partOfSpeech: 'int.',
                          example: 'Hello, everyone!',
                          translation: '大家好！',
                        },
                        {
                          word: 'name',
                          meaning: '名字',
                          order: 2,
                          ipa: 'neɪm',
                          partOfSpeech: 'n.',
                          example: 'My name is Li Ming.',
                          translation: '我的名字叫李明。',
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  },
};
