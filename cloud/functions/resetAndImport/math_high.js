// 高中数学（人教 A 版 2019 新课标）——必修第一册。
// 建模沿用物理：一节一个知识点，公式写进 explanation；四段式【是什么→为什么→结论→怎么用】+ 每节 3 梯度题。
// 由 scripts/add_math_high.js 挂到数学「知识点」路径，作为教材「人教版数学 2019」。
module.exports = {
  textbook: {
    name: '人教版数学 2019',
    order: 2,
    curriculumVersion: '人教版2019',
    semesters: [
      {
        name: '高一上册',
        order: 1,
        grade: 10,
        stage: 'senior',
        chapters: [
          {
            title: '集合与常用逻辑用语',
            order: 1,
            knowledge: [
              {
                word: '集合的概念',
                meaning: '把一些确定的、不同的对象看成一个整体，这个整体就是集合',
                order: 1,
                partOfSpeech: '集合与逻辑',
                example: '所有正整数组成的集合、全班同学组成的集合',
                explanation:
                  '【是什么】「所有正整数」「班里所有男生」——把一批对象看成整体，就是集合。【为什么】数学要讨论「一类东西」，用集合把它们「装」在一起，才说得清。【结论】集合三要素：**确定性、互异性、无序性**；元素与集合用「∈ / ∉」表示。【怎么用】集合里的元素不能重复（互异性），这是最常见的坑。',
                quiz: [
                  {
                    stem: '集合三要素不包括？',
                    options: ['确定性', '互异性', '无序性', '连续性'],
                    answerIndex: 3,
                  },
                  {
                    stem: '元素 a 属于集合 A，记作？',
                    options: ['a ∈ A', 'a ∉ A', 'a ⊆ A', 'a ⊂ A'],
                    answerIndex: 0,
                  },
                  {
                    stem: '集合 {1, 2, 2, 3} 实际等于？',
                    options: ['{1, 2, 3}', '{1, 2, 2, 3}', '{1, 2}', '{1, 3}'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: '集合间的基本关系',
                meaning: '子集、真子集、集合相等',
                order: 2,
                partOfSpeech: '集合与逻辑',
                example: '{1, 2} 是 {1, 2, 3} 的子集',
                explanation:
                  '【是什么】一个集合里的元素全在另一个集合里，这两个集合就有「包含」关系。【为什么】比较两个集合，看一个的每个元素是不是都在另一个里。【结论】若 A 的每个元素都在 B 里，则 A ⊆ B（子集）；A ⊆ B 且 B ⊆ A 时 A = B。【怎么用】空集是任何集合的子集，这点常被忽略。',
                quiz: [
                  {
                    stem: 'A ⊆ B 表示？',
                    options: ['A 是 B 的子集', 'B 是 A 的子集', 'A 与 B 相等', 'A 与 B 无交集'],
                    answerIndex: 0,
                  },
                  {
                    stem: '空集是任何集合的？',
                    options: ['子集', '真子集', '元素', '补集'],
                    answerIndex: 0,
                  },
                  {
                    stem: '{1,2} 与 {2,1} 的关系是？',
                    options: ['相等', '前者是后者真子集', '后者是前者真子集', '无关'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: '集合的基本运算',
                meaning: '交集、并集、补集',
                order: 3,
                partOfSpeech: '集合与逻辑',
                example: 'A∩B 是公共部分，A∪B 是合起来',
                explanation:
                  '【是什么】两个集合的「公共部分」是交集，「合在一起」是并集，全集里「不属于它的」是补集。【为什么】处理多个条件时，用交并补把范围「算」出来。【结论】A∩B = {x | x∈A 且 x∈B}；A∪B = {x | x∈A 或 x∈B}；补集 ∁UA。【怎么用】「且」对应交、「或」对应并，别搞反。',
                quiz: [
                  {
                    stem: 'A∩B 表示？',
                    options: ['A 与 B 的公共部分', 'A 与 B 的全部', 'A 去掉 B', 'B 去掉 A'],
                    answerIndex: 0,
                  },
                  {
                    stem: '「x 属于 A 且属于 B」对应？',
                    options: ['A∩B', 'A∪B', '∁UA', 'A-B'],
                    answerIndex: 0,
                  },
                  {
                    stem: '全集 U={1,2,3,4}，A={1,2}，则 ∁UA =',
                    options: ['{3,4}', '{1,2}', '{1,2,3,4}', '∅'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: '充分条件与必要条件',
                meaning: '若 p⇒q，则 p 是 q 的充分条件，q 是 p 的必要条件',
                order: 4,
                partOfSpeech: '集合与逻辑',
                example: '「x>2」是「x>1」的充分条件',
                explanation:
                  '【是什么】「下雨了」能推出「地面湿」——下雨是地面湿的充分条件，地面湿是下雨的必要条件。【为什么】p 能推出 q（p⇒q），说明有 p 一定有 q，没 q 一定没 p。【结论】p⇒q：p 充分、q 必要；p⇔q 则互为充要。【怎么用】判断方向别反：「充分」指「够不够推过去」，「必要」指「缺了它行不行」。',
                quiz: [
                  {
                    stem: '若 p⇒q，则 p 是 q 的？',
                    options: ['充分条件', '必要条件', '充要条件', '无关条件'],
                    answerIndex: 0,
                  },
                  {
                    stem: '若 p⇒q，则 q 是 p 的？',
                    options: ['必要条件', '充分条件', '充要条件', '无关条件'],
                    answerIndex: 0,
                  },
                  {
                    stem: '「x=1」是「x²=1」的？',
                    options: ['充分不必要条件', '必要不充分条件', '充要条件', '无关'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: '全称量词与存在量词',
                meaning: '全称量词「任意」、存在量词「存在」及其否定',
                order: 5,
                partOfSpeech: '集合与逻辑',
                example: '「任意 x>0，x²>0」与「存在 x，使 x²=1」',
                explanation:
                  '【是什么】「所有」「任意」是全称量词，「存在」「有些」是存在量词。【为什么】数学命题常涉及「对所有的……都成立」或「存在一个……成立」，用符号精确表达。【结论】全称命题「∀x，p(x)」，存在命题「∃x，p(x)」；否定时互相转换。【怎么用】全称命题的否定是存在命题（∀↔∃ 互换），别只加「不」。',
                quiz: [
                  {
                    stem: '「∀x」表示？',
                    options: ['任意 x', '存在 x', '唯一的 x', '没有 x'],
                    answerIndex: 0,
                  },
                  {
                    stem: '「∃x」表示？',
                    options: ['存在 x', '任意 x', '所有 x', '某个确定的 x'],
                    answerIndex: 0,
                  },
                  {
                    stem: '「所有 x 都满足 p」的否定是？',
                    options: [
                      '存在 x 不满足 p',
                      '所有 x 不满足 p',
                      '存在 x 满足 p',
                      '没有 x 满足 p',
                    ],
                    answerIndex: 0,
                  },
                ],
              },
            ],
          },
          {
            title: '一元二次函数、方程和不等式',
            order: 2,
            knowledge: [
              {
                word: '等式性质与不等式性质',
                meaning: '等式与不等式的基本性质，传递性、加减乘除性',
                order: 1,
                partOfSpeech: '函数',
                example: 'a>b 且 b>c，则 a>c（传递性）',
                explanation:
                  '【是什么】「大于」「小于」之间能像等式一样做运算吗？【为什么】不等式有基本性质：传递、两边同加减、两边同乘除正数不变号。【结论】a>b ⇔ a-b>0；乘除**负数**要变号。【怎么用】解不等式时，两边乘负数必须变号，这是最常错的一步。',
                quiz: [
                  {
                    stem: '若 a>b，则 a-b？',
                    options: ['大于 0', '小于 0', '等于 0', '不确定'],
                    answerIndex: 0,
                  },
                  {
                    stem: '若 a>b，两边同乘 -1，得？',
                    options: ['-a < -b', '-a > -b', '-a = -b', '不变'],
                    answerIndex: 0,
                  },
                  {
                    stem: 'a>b 且 b>c，则？',
                    options: ['a>c', 'a<c', 'a=c', '不确定'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: '基本不等式',
                meaning: 'a²+b²≥2ab，均值不等式 (a+b)/2≥√ab',
                order: 2,
                partOfSpeech: '函数',
                example: '已知正数 a、b，求 a+b 的最小值',
                explanation:
                  '【是什么】任意两个数，它们的平方和总不小于乘积的 2 倍。【为什么】(a-b)² ≥ 0 恒成立，展开移项就是 a²+b² ≥ 2ab，正数时可开方得均值不等式。【结论】(a+b)/2 ≥ √ab（a、b 正数），当且仅当 a=b 取等。【怎么用】「一正二定三相等」——用基本不等式求最值要验证取等条件。',
                quiz: [
                  {
                    stem: 'a²+b² 与 2ab 的关系是？',
                    options: ['a²+b²≥2ab', 'a²+b²≤2ab', 'a²+b²=2ab', '无关'],
                    answerIndex: 0,
                  },
                  {
                    stem: '正数 a、b 的均值不等式是？',
                    options: ['(a+b)/2≥√ab', '(a+b)/2≤√ab', '(a+b)/2=√ab', 'a+b≥2ab'],
                    answerIndex: 0,
                  },
                  {
                    stem: '基本不等式取等号的条件是？',
                    options: ['a=b', 'a>b', 'a<b', '任意'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: '二次函数与一元二次方程',
                meaning: '二次函数 y=ax²+bx+c 与方程 ax²+bx+c=0 的根',
                order: 3,
                partOfSpeech: '函数',
                example: '判别式 Δ=b²-4ac 判断根的个数',
                explanation:
                  '【是什么】二次函数图像与 x 轴的交点，就是对应方程 ax²+bx+c=0 的根。【为什么】函数值为 0 时，就是方程；交点的横坐标就是根。【结论】判别式 Δ=b²-4ac：Δ>0 两个交点（两实根）、Δ=0 一个交点、Δ<0 无交点。【怎么用】根的个数看 Δ，根的和积用韦达定理。',
                quiz: [
                  {
                    stem: '判别式 Δ 的公式是？',
                    options: ['b²-4ac', 'b²+4ac', '4ac-b²', 'b-4ac'],
                    answerIndex: 0,
                  },
                  {
                    stem: 'Δ>0 时，二次函数与 x 轴？',
                    options: ['两个交点', '一个交点', '无交点', '不确定'],
                    answerIndex: 0,
                  },
                  {
                    stem: 'Δ<0 时，方程 ax²+bx+c=0？',
                    options: ['无实根', '两个实根', '一个实根', '无数根'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: '一元二次不等式',
                meaning: '解 ax²+bx+c>0（或 <0），结合二次函数图像看正负',
                order: 4,
                partOfSpeech: '函数',
                example: 'x²-3x+2>0 的解集是 x<1 或 x>2',
                explanation:
                  '【是什么】x²-3x+2>0 这样的不等式怎么解？【为什么】结合二次函数图像：开口向上时，图像在 x 轴上方的部分就是 >0 的解。【结论】先求根，再按「大于取两边、小于取中间」定解集（a>0 时）。【怎么用】开口向下（a<0）要先变号，或反过来取。',
                quiz: [
                  {
                    stem: '解一元二次不等式，第一步通常？',
                    options: ['求根', '画圆', '求导', '取对数'],
                    answerIndex: 0,
                  },
                  {
                    stem: 'a>0 时，ax²+bx+c>0 的解在？',
                    options: ['两根之外（取两边）', '两根之间', '全体实数', '空集'],
                    answerIndex: 0,
                  },
                  {
                    stem: 'a>0 时，ax²+bx+c<0 的解在？',
                    options: ['两根之间', '两根之外', '全体实数', '空集'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: '不等式的应用',
                meaning: '用不等式解决最值、恒成立问题',
                order: 5,
                partOfSpeech: '函数',
                example: '求 x + 1/x (x>0) 的最小值',
                explanation:
                  '【是什么】「求最大值最小值」「对任意 x 恒成立」怎么用不等式解？【为什么】恒成立问题转化为「最大值或最小值满足条件」；最值常用基本不等式或二次函数。【结论】恒成立：f(x)≥a 恒成立 ⇔ f(x)的最小值 ≥ a。【怎么用】把「恒成立」翻译成「最值」问题，是这类题的钥匙。',
                quiz: [
                  {
                    stem: 'f(x)≥a 恒成立，等价于？',
                    options: [
                      'f(x) 最小值 ≥ a',
                      'f(x) 最大值 ≥ a',
                      'f(x) 最小值 ≤ a',
                      'f(x)≥a 有解',
                    ],
                    answerIndex: 0,
                  },
                  {
                    stem: 'x>0 时，x + 1/x 的最小值是？',
                    options: ['2', '1', '0', '不存在'],
                    answerIndex: 0,
                  },
                  {
                    stem: 'f(x)≤a 恒成立，等价于？',
                    options: ['f(x) 最大值 ≤ a', 'f(x) 最小值 ≤ a', 'f(x) 最大值 ≥ a', '无关'],
                    answerIndex: 0,
                  },
                ],
              },
            ],
          },
          {
            title: '函数的概念与性质',
            order: 3,
            knowledge: [
              {
                word: '函数的概念',
                meaning: '函数的三要素：定义域、对应关系、值域',
                order: 1,
                partOfSpeech: '函数',
                example: 'y = 2x，x∈R 是一个函数',
                explanation:
                  '【是什么】给一个 x，按规则算出唯一的 y——这就是函数。【为什么】函数是「输入→输出」的对应关系，每个 x 只能对应一个 y。【结论】函数三要素：**定义域、对应关系、值域**；两函数相同要求三要素都相同。【怎么用】定义域是「x 能取哪些值」，值域是「y 能取哪些值」。',
                quiz: [
                  {
                    stem: '函数三要素是？',
                    options: [
                      '定义域、对应关系、值域',
                      '自变量、因变量、常数',
                      '斜率、截距、顶点',
                      '定义域、单调性、奇偶性',
                    ],
                    answerIndex: 0,
                  },
                  {
                    stem: '函数 y=f(x) 中，每个 x 对应？',
                    options: ['唯一一个 y', '多个 y', '可以没有 y', '任意 y'],
                    answerIndex: 0,
                  },
                  {
                    stem: '两函数相同的条件是？',
                    options: ['三要素都相同', '对应关系相同', '定义域相同', '值域相同'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: '函数的表示法',
                meaning: '解析法、列表法、图像法',
                order: 2,
                partOfSpeech: '函数',
                example: 'y=x²（解析法）、表格（列表法）、曲线（图像法）',
                explanation:
                  '【是什么】一个函数可以用公式、表格、图像三种方式表示。【为什么】不同表示法各有优势：解析法精确、列表法直观、图像法看趋势。【结论】解析法、列表法、图像法可以互相转化。【怎么用】实际问题常给表格或图像，要能「读出」函数关系。',
                quiz: [
                  {
                    stem: '函数的三种表示法不包括？',
                    options: ['解析法', '列表法', '图像法', '定义法'],
                    answerIndex: 3,
                  },
                  {
                    stem: '用公式 y=x² 表示函数，属于？',
                    options: ['解析法', '列表法', '图像法', '无法表示'],
                    answerIndex: 0,
                  },
                  {
                    stem: '看函数图像判断增减，用的是？',
                    options: ['图像法', '解析法', '列表法', '都不对'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: '函数的单调性',
                meaning: '函数值随自变量增大而增大（增）或减小（减）',
                order: 3,
                partOfSpeech: '函数',
                example: 'y=x² 在 (0,+∞) 递增，在 (-∞,0) 递减',
                explanation:
                  '【是什么】图像从左往右「上升」是增函数，「下降」是减函数。【为什么】增函数：x 增大时 y 也增大；减函数反之。【结论】用定义证单调性：设 x₁<x₂，比较 f(x₁) 与 f(x₂)。【怎么用】判断单调性不能只看一两个点，要看整个区间。',
                quiz: [
                  {
                    stem: '增函数是指？',
                    options: ['x 增大 y 也增大', 'x 增大 y 减小', 'y 不变', 'x 不变'],
                    answerIndex: 0,
                  },
                  {
                    stem: 'y=x² 在 (0,+∞) 上的单调性是？',
                    options: ['单调递增', '单调递减', '先增后减', '不单调'],
                    answerIndex: 0,
                  },
                  {
                    stem: '证明单调性，通常设？',
                    options: ['x₁<x₂ 比较 f(x₁)、f(x₂)', 'x₁>x₂', 'x₁=x₂', '不用设'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: '函数的奇偶性',
                meaning: '偶函数图像关于 y 轴对称，奇函数关于原点对称',
                order: 4,
                partOfSpeech: '函数',
                example: 'y=x² 是偶函数，y=x³ 是奇函数',
                explanation:
                  '【是什么】图像关于 y 轴对称的是偶函数，关于原点对称的是奇函数。【为什么】偶函数 f(-x)=f(x)，奇函数 f(-x)=-f(x)。【结论】偶函数关于 y 轴对称，奇函数关于原点对称。【怎么用】先看定义域是否关于原点对称，否则既不是奇也不是偶。',
                quiz: [
                  {
                    stem: '偶函数满足？',
                    options: ['f(-x)=f(x)', 'f(-x)=-f(x)', 'f(-x)=0', 'f(x)=0'],
                    answerIndex: 0,
                  },
                  {
                    stem: '奇函数满足？',
                    options: ['f(-x)=-f(x)', 'f(-x)=f(x)', 'f(-x)=1', 'f(x)=1'],
                    answerIndex: 0,
                  },
                  {
                    stem: '偶函数图像关于？',
                    options: ['y 轴对称', '原点对称', 'x 轴对称', '直线 y=x 对称'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: '幂函数',
                meaning: '形如 y=x^α 的函数',
                order: 5,
                partOfSpeech: '函数',
                example: 'y=x、y=x²、y=x³、y=x^(-1)',
                explanation:
                  '【是什么】y=x²、y=x³、y=√x 这类「x 的多少次方」的函数统称幂函数。【为什么】底数是自变量、指数是常数的函数就是幂函数。【结论】幂函数 y=x^α，图像和性质随 α 变化。【怎么用】幂函数与指数函数不同：幂函数是「底数变」，指数函数是「指数变」。',
                quiz: [
                  {
                    stem: '幂函数的一般形式是？',
                    options: ['y=x^α', 'y=a^x', 'y=log_a x', 'y=ax²+bx+c'],
                    answerIndex: 0,
                  },
                  {
                    stem: 'y=x² 是？',
                    options: ['幂函数', '指数函数', '对数函数', '三角函数'],
                    answerIndex: 0,
                  },
                  {
                    stem: 'y=2^x 是？',
                    options: ['指数函数', '幂函数', '对数函数', '幂函数'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: '函数的零点',
                meaning: '使 f(x)=0 的 x 叫零点，零点存在定理',
                order: 6,
                partOfSpeech: '函数',
                example: 'f(x)=x-1 的零点是 x=1',
                explanation:
                  '【是什么】函数图像与 x 轴交点的横坐标，就是函数的零点。【为什么】f(x)=0 时，图像正好在 x 轴上，这个 x 就是零点。【结论】零点 = 方程 f(x)=0 的根；若 f(a)f(b)<0，则 (a,b) 内必有零点（零点存在定理）。【怎么用】零点存在定理只保证「至少有一个」，不保证唯一。',
                quiz: [
                  {
                    stem: '函数的零点是？',
                    options: ['使 f(x)=0 的 x', 'f(0)', '图像与 y 轴交点', '定义域端点'],
                    answerIndex: 0,
                  },
                  {
                    stem: 'f(a)f(b)<0 说明 (a,b) 内？',
                    options: ['至少有一个零点', '没有零点', '恰有一个零点', '无数零点'],
                    answerIndex: 0,
                  },
                  { stem: 'f(x)=x-2 的零点是？', options: ['2', '-2', '0', '1'], answerIndex: 0 },
                ],
              },
            ],
          },
          {
            title: '指数函数与对数函数',
            order: 4,
            knowledge: [
              {
                word: '指数与指数运算',
                meaning: '指数幂的运算性质、分数指数幂',
                order: 1,
                partOfSpeech: '函数',
                example: 'a^m·a^n=a^(m+n)',
                explanation:
                  '【是什么】a 连乘 n 次记作 aⁿ，这是指数幂。【为什么】指数幂有运算律：同底数幂相乘指数相加等。【结论】a^m·a^n=a^(m+n)，(a^m)^n=a^(mn)，(ab)^n=a^n·b^n；分数指数幂 a^(1/n)=ⁿ√a。【怎么用】负指数、分数指数幂是「倒数」「开方」的另一种写法。',
                quiz: [
                  {
                    stem: 'a^m·a^n =？',
                    options: ['a^(m+n)', 'a^(mn)', 'a^(m-n)', 'a^(m/n)'],
                    answerIndex: 0,
                  },
                  {
                    stem: '(a^m)^n =？',
                    options: ['a^(mn)', 'a^(m+n)', 'a^(m-n)', 'a^m+n'],
                    answerIndex: 0,
                  },
                  {
                    stem: 'a^(-n) 等于？',
                    options: ['1/a^n', 'a^n', '-a^n', 'a^(1/n)'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: '指数函数',
                meaning: 'y=a^x（a>0 且 a≠1），a>1 增、0<a<1 减',
                order: 2,
                partOfSpeech: '函数',
                example: 'y=2^x 递增，y=(1/2)^x 递减',
                explanation:
                  '【是什么】底数固定、指数是自变量的函数，就是指数函数。【为什么】它的增长（或衰减）很快，图像必过点 (0,1)。【结论】y=a^x：a>1 单调递增，0<a<1 单调递减，定义域 R、值域 (0,+∞)。【怎么用】指数函数图像恒过 (0,1)，且恒在 x 轴上方。',
                quiz: [
                  {
                    stem: '指数函数的一般形式是？',
                    options: ['y=a^x (a>0, a≠1)', 'y=x^a', 'y=log_a x', 'y=ax'],
                    answerIndex: 0,
                  },
                  {
                    stem: 'y=2^x 的单调性是？',
                    options: ['单调递增', '单调递减', '不单调', '先增后减'],
                    answerIndex: 0,
                  },
                  {
                    stem: '指数函数 y=a^x 的图像必过？',
                    options: ['(0,1)', '(1,0)', '(0,0)', '(1,1)'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: '对数与对数运算',
                meaning: '对数的定义、运算性质、换底公式',
                order: 3,
                partOfSpeech: '函数',
                example: 'log₂8=3，因为 2³=8',
                explanation:
                  '【是什么】「2 的几次方等于 8？」答案是 3，记作 log₂8=3，这就是对数。【为什么】对数是「求指数的运算」，与指数互为逆运算。【结论】a^b=N ⇔ log_a N=b；运算：log_a(MN)=log_a M+log_a N 等；换底公式 log_a b = log_c b / log_c a。【怎么用】对数把「乘法变加法」，是简化计算的工具。',
                quiz: [
                  { stem: 'log₂8 =？', options: ['3', '2', '4', '8'], answerIndex: 0 },
                  {
                    stem: 'log_a(MN) =？',
                    options: [
                      'log_a M + log_a N',
                      'log_a M · log_a N',
                      'log_a M - log_a N',
                      'log_a M / log_a N',
                    ],
                    answerIndex: 0,
                  },
                  {
                    stem: 'a^b=N 等价于？',
                    options: ['log_a N = b', 'log_N a = b', 'log_a b = N', 'log_b N = a'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: '对数函数',
                meaning: 'y=log_a x，a>1 增、0<a<1 减，与指数函数互为反函数',
                order: 4,
                partOfSpeech: '函数',
                example: 'y=log₂x 递增，过点 (1,0)',
                explanation:
                  '【是什么】真数是自变量、底数固定的函数，就是对数函数。【为什么】它是指数函数的反函数，图像关于直线 y=x 对称。【结论】y=log_a x：定义域 (0,+∞)，图像必过 (1,0)，a>1 增、0<a<1 减。【怎么用】对数函数定义域是 (0,+∞)，真数必须大于 0。',
                quiz: [
                  {
                    stem: '对数函数 y=log_a x 的定义域是？',
                    options: ['(0,+∞)', 'R', '[0,+∞)', '(-∞,0)'],
                    answerIndex: 0,
                  },
                  {
                    stem: '对数函数图像必过？',
                    options: ['(1,0)', '(0,1)', '(0,0)', '(1,1)'],
                    answerIndex: 0,
                  },
                  {
                    stem: 'y=log₂x 的单调性是？',
                    options: ['单调递增', '单调递减', '不单调', '先增后减'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: '函数的应用',
                meaning: '用函数模型解决实际问题，二分法求零点',
                order: 5,
                partOfSpeech: '函数',
                example: '人口增长用指数模型，二分法求方程近似解',
                explanation:
                  '【是什么】增长、衰减、利息这些实际问题，用函数模型描述。【为什么】实际问题「翻译」成函数，再求解；二分法反复取中点逼近零点。【结论】常见模型：指数增长、对数增长、幂增长；二分法求零点近似解。【怎么用】二分法：区间两端函数值异号，取中点缩小区间，逼近零点。',
                quiz: [
                  {
                    stem: '人口增长常用什么模型？',
                    options: ['指数增长模型', '对数模型', '一次函数', '正弦模型'],
                    answerIndex: 0,
                  },
                  {
                    stem: '二分法求零点的前提是？',
                    options: ['区间两端函数值异号', '函数单调', '函数连续', '函数可导'],
                    answerIndex: 0,
                  },
                  {
                    stem: '二分法通过什么缩小区间？',
                    options: ['取中点', '取端点', '取四分之一', '取三分之一点'],
                    answerIndex: 0,
                  },
                ],
              },
            ],
          },
          {
            title: '三角函数',
            order: 5,
            knowledge: [
              {
                word: '任意角和弧度制',
                meaning: '任意角的定义、弧度制，1 弧度 = 180°/π',
                order: 1,
                partOfSpeech: '三角函数',
                example: '360° = 2π 弧度',
                explanation:
                  '【是什么】角不限于 0°~360°，可以任意大、任意方向。【为什么】用弧度制（弧长 ÷ 半径）度量角，方便后续三角函数研究。【结论】弧度制：弧长 l、半径 r，角 α = l/r；π 弧度 = 180°。【怎么用】角度和弧度要会互化：180°=π，所以 90°=π/2。',
                quiz: [
                  {
                    stem: 'π 弧度等于多少度？',
                    options: ['180°', '90°', '360°', '45°'],
                    answerIndex: 0,
                  },
                  {
                    stem: '90° 等于多少弧度？',
                    options: ['π/2', 'π/4', 'π/3', 'π'],
                    answerIndex: 0,
                  },
                  {
                    stem: '弧度的定义是？',
                    options: ['弧长 ÷ 半径', '半径 ÷ 弧长', '弧长 × 半径', '角度 × π'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: '三角函数的概念',
                meaning: '单位圆上定义 sin、cos、tan',
                order: 2,
                partOfSpeech: '三角函数',
                example: 'sinα = 对边/斜边，单位圆上 sinα=y',
                explanation:
                  '【是什么】直角三角形里，正弦余弦正切描述角和边的关系。【为什么】推广到任意角，用单位圆上的点定义：sinα=y，cosα=x，tanα=y/x。【结论】单位圆上，角 α 终边与圆的交点 (cosα, sinα)。【怎么用】各象限的正负号由坐标符号决定，这是记忆重点。',
                quiz: [
                  {
                    stem: '单位圆上，sinα 等于？',
                    options: ['终边交点的纵坐标', '横坐标', '斜边', '半径'],
                    answerIndex: 0,
                  },
                  {
                    stem: '单位圆上，cosα 等于？',
                    options: ['终边交点的横坐标', '纵坐标', '斜边', '半径'],
                    answerIndex: 0,
                  },
                  {
                    stem: 'tanα 等于？',
                    options: ['sinα/cosα', 'cosα/sinα', 'sinα·cosα', 'sinα+cosα'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: '诱导公式',
                meaning: '把任意角的三角函数化为锐角三角函数的公式',
                order: 3,
                partOfSpeech: '三角函数',
                example: 'sin(π-α)=sinα，cos(-α)=cosα',
                explanation:
                  '【是什么】求 sin150°、cos(-30°) 这类非锐角的三角函数值。【为什么】利用单位圆的对称性，把任意角「化」成锐角再算。【结论】「奇变偶不变，符号看象限」——口诀概括诱导公式。【怎么用】先看角是 90° 的几倍（奇变偶不变），再看原角所在象限定符号。',
                quiz: [
                  {
                    stem: 'sin(π-α) =？',
                    options: ['sinα', '-sinα', 'cosα', '-cosα'],
                    answerIndex: 0,
                  },
                  {
                    stem: 'cos(-α) =？',
                    options: ['cosα', '-cosα', 'sinα', '-sinα'],
                    answerIndex: 0,
                  },
                  {
                    stem: '诱导公式口诀是？',
                    options: ['奇变偶不变，符号看象限', '同增异减', '左加右减', '上加下减'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: '三角函数的图像与性质',
                meaning: '正弦余弦正切函数的图像、周期性、单调性',
                order: 4,
                partOfSpeech: '三角函数',
                example: 'y=sinx 周期 2π，值域 [-1,1]',
                explanation:
                  '【是什么】sin、cos、tan 的图像是波浪线，有周期性。【为什么】正弦余弦是周期函数，图像重复出现。【结论】y=sinx、y=cosx 周期 2π、值域 [-1,1]；y=tanx 周期 π。【怎么用】周期、对称轴、单调区间都要会从图像读出来。',
                quiz: [
                  { stem: 'y=sinx 的周期是？', options: ['2π', 'π', 'π/2', '4π'], answerIndex: 0 },
                  {
                    stem: 'y=sinx 的值域是？',
                    options: ['[-1,1]', '[0,1]', 'R', '[0,+∞)'],
                    answerIndex: 0,
                  },
                  { stem: 'y=cosx 的周期是？', options: ['2π', 'π', 'π/2', '4π'], answerIndex: 0 },
                ],
              },
              {
                word: '三角恒等变换',
                meaning: '两角和差公式、二倍角公式',
                order: 5,
                partOfSpeech: '三角函数',
                example: 'sin(α+β)=sinαcosβ+cosαsinβ',
                explanation:
                  '【是什么】sin(α+β)、cos2α 这些「组合角」的三角函数怎么展开？【为什么】由两角和差公式，能推出二倍角、半角等一堆公式。【结论】核心公式：sin(α±β)=sinαcosβ±cosαsinβ，cos(α±β)=cosαcosβ∓sinαsinβ；二倍角 sin2α=2sinαcosα。【怎么用】这些公式是化简、求值的工具，要熟记。',
                quiz: [
                  {
                    stem: 'sin(α+β) =？',
                    options: [
                      'sinαcosβ+cosαsinβ',
                      'sinαcosβ-cosαsinβ',
                      'cosαcosβ+sinαsinβ',
                      'cosαcosβ-sinαsinβ',
                    ],
                    answerIndex: 0,
                  },
                  {
                    stem: 'sin2α =？',
                    options: ['2sinαcosα', 'sin²α+cos²α', '2cosα', '2sinα'],
                    answerIndex: 0,
                  },
                  {
                    stem: 'cos(α-β) =？',
                    options: [
                      'cosαcosβ+sinαsinβ',
                      'cosαcosβ-sinαsinβ',
                      'sinαcosβ+cosαsinβ',
                      'sinαcosβ-cosαsinβ',
                    ],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: '函数 y=Asin(ωx+φ)',
                meaning: '振幅 A、周期 2π/ω、初相 φ',
                order: 6,
                partOfSpeech: '三角函数',
                example: 'y=2sin(3x+π/4) 的振幅 2、周期 2π/3',
                explanation:
                  '【是什么】y=Asin(ωx+φ) 是简谐运动的数学模型，描述振动的振幅、周期、相位。【为什么】A 控制振幅（最大偏离），ω 控制周期（快慢），φ 控制起始位置。【结论】振幅 |A|，周期 T=2π/|ω|，频率 f=1/T。【怎么用】已知图像求解析式：看最大值定 A、看周期定 ω、看起点定 φ。',
                quiz: [
                  {
                    stem: 'y=Asin(ωx+φ) 的周期是？',
                    options: ['2π/|ω|', '2π/ω', '2π|ω|', 'ω/2π'],
                    answerIndex: 0,
                  },
                  { stem: 'A 表示？', options: ['振幅', '周期', '相位', '频率'], answerIndex: 0 },
                  {
                    stem: 'y=2sin(3x+π/4) 的振幅是？',
                    options: ['2', '3', 'π/4', '6'],
                    answerIndex: 0,
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        name: '高一下册',
        order: 2,
        grade: 10,
        stage: 'senior',
        chapters: [
          {
            title: '平面向量及其应用',
            order: 1,
            knowledge: [
              {
                word: '平面向量的概念',
                meaning: '既有大小又有方向的量，用有向线段表示',
                order: 1,
                partOfSpeech: '几何与代数',
                example: '位移、力、速度都是向量',
                explanation:
                  '【是什么】「向东走 3 米」和「走 3 米」不一样——前者有方向，这就是向量。【为什么】有些量只有大小（数量），有些量既有大小又有方向（向量）。【结论】向量用有向线段表示，长度叫**模**；零向量、单位向量是特殊情况。【怎么用】两个向量相等，要求大小和方向都相同（与起点无关）。',
                quiz: [
                  {
                    stem: '向量是？',
                    options: [
                      '既有大小又有方向的量',
                      '只有大小的量',
                      '只有方向的量',
                      '没有方向的量',
                    ],
                    answerIndex: 0,
                  },
                  {
                    stem: '向量的模是？',
                    options: ['向量的长度', '向量的方向', '向量的起点', '向量的终点'],
                    answerIndex: 0,
                  },
                  {
                    stem: '两向量相等要求？',
                    options: ['大小方向都相同', '大小相同', '方向相同', '起点相同'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: '向量的加减法',
                meaning: '三角形法则、平行四边形法则',
                order: 2,
                partOfSpeech: '几何与代数',
                example: 'a+b 用三角形法则首尾相连',
                explanation:
                  '【是什么】两个向量怎么加？【为什么】位移的合成：先走 a 再走 b，总位移就是 a+b（三角形法则）。【结论】加法：三角形法则（首尾相连）或平行四边形法则；减法 a-b = a+(-b)。【怎么用】三角形法则「首尾相接，起点指终点」。',
                quiz: [
                  {
                    stem: '向量加法的三角形法则是？',
                    options: ['首尾相连', '起点重合', '平行移动', '反向延长'],
                    answerIndex: 0,
                  },
                  {
                    stem: 'a - b 等于？',
                    options: ['a + (-b)', 'a + b', '-a + b', 'b - a'],
                    answerIndex: 0,
                  },
                  {
                    stem: '向量加法的平行四边形法则，和向量是？',
                    options: ['对角线', '边', '中线', '高'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: '向量的数乘',
                meaning: '实数 λ 与向量相乘，λa 与 a 共线',
                order: 3,
                partOfSpeech: '几何与代数',
                example: '2a 是 a 方向不变、长度 2 倍',
                explanation:
                  '【是什么】「把 a 拉长 2 倍」就是 2a，这就是数乘。【为什么】λ 乘向量，改变长度（|λ|倍），λ>0 同向、λ<0 反向。【结论】λa 与 a 共线；向量共线定理：a、b 共线 ⇔ b=λa。【怎么用】数乘是判断向量共线、平行的工具。',
                quiz: [
                  {
                    stem: '2a 与 a 的关系是？',
                    options: ['共线且长度 2 倍', '垂直', '相等', '无关'],
                    answerIndex: 0,
                  },
                  {
                    stem: '-a 与 a 的关系是？',
                    options: ['共线反向等长', '共线同向', '垂直', '相等'],
                    answerIndex: 0,
                  },
                  {
                    stem: 'a、b 共线的充要条件是？',
                    options: ['存在 λ 使 b=λa', 'a=b', '|a|=|b|', 'a⊥b'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: '向量的数量积',
                meaning: 'a·b = |a||b|cosθ，判断垂直、求夹角',
                order: 4,
                partOfSpeech: '几何与代数',
                example: 'a·b=0 表示 a⊥b',
                explanation:
                  '【是什么】两个向量的「乘积」能表示夹角关系，这就是数量积。【为什么】数量积 a·b = |a||b|cosθ，θ 是夹角，把长度和角度连起来。【结论】a·b = |a||b|cosθ；a⊥b ⇔ a·b=0。【怎么用】求夹角、判断垂直都用数量积，是向量应用的「灵魂」。',
                quiz: [
                  {
                    stem: '数量积 a·b 的公式是？',
                    options: ['|a||b|cosθ', '|a||b|sinθ', '|a||b|', '|a|+|b|'],
                    answerIndex: 0,
                  },
                  {
                    stem: 'a·b=0 表示？',
                    options: ['a⊥b', 'a∥b', 'a=b', '|a|=|b|'],
                    answerIndex: 0,
                  },
                  {
                    stem: '数量积的结果是？',
                    options: ['数量', '向量', '角', '长度'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: '向量的坐标运算',
                meaning: '向量用坐标表示，加减、数乘、数量积都化成坐标运算',
                order: 5,
                partOfSpeech: '几何与代数',
                example: 'a=(x1,y1), b=(x2,y2)，则 a·b=x1x2+y1y2',
                explanation:
                  '【是什么】把向量放到坐标系里，用坐标表示，运算变简单。【为什么】向量坐标化后，加减、数乘、数量积都变成坐标的代数运算。【结论】a=(x1,y1), b=(x2,y2)：a±b=(x1±x2, y1±y2)，a·b=x1x2+y1y2，|a|=√(x1²+y1²)。【怎么用】坐标运算把几何问题代数化，是解析法的起点。',
                quiz: [
                  {
                    stem: 'a=(1,2), b=(3,4)，则 a+b=？',
                    options: ['(4,6)', '(2,2)', '(3,8)', '(4,8)'],
                    answerIndex: 0,
                  },
                  {
                    stem: 'a=(1,2), b=(3,4)，则 a·b=？',
                    options: ['11', '7', '10', '5'],
                    answerIndex: 0,
                  },
                  { stem: 'a=(3,4)，则 |a|=？', options: ['5', '7', '4', '3'], answerIndex: 0 },
                ],
              },
              {
                word: '正弦定理和余弦定理',
                meaning: '解三角形的两个定理',
                order: 6,
                partOfSpeech: '几何与代数',
                example: '已知两边夹角求第三边用余弦定理',
                explanation:
                  '【是什么】三角形的边和角之间有什么关系，能「算」出来？【为什么】正弦定理 a/sinA=b/sinB=c/sinC=2R；余弦定理 a²=b²+c²-2bc·cosA。【结论】已知两角一边用正弦定理；已知两边夹角或三边用余弦定理。【怎么用】解三角形（求边角）是高考常考，两个定理要会选会用。',
                quiz: [
                  {
                    stem: '正弦定理是？',
                    options: ['a/sinA=b/sinB=c/sinC', 'a²=b²+c²', 'a=b+c', 'a·b=0'],
                    answerIndex: 0,
                  },
                  {
                    stem: '余弦定理是？',
                    options: ['a²=b²+c²-2bc·cosA', 'a/sinA=b/sinB', 'a²=b²+c²+2bc', 'a=b+c'],
                    answerIndex: 0,
                  },
                  {
                    stem: '已知两边及其夹角，求第三边用？',
                    options: ['余弦定理', '正弦定理', '勾股定理', '面积公式'],
                    answerIndex: 0,
                  },
                ],
              },
            ],
          },
          {
            title: '复数',
            order: 2,
            knowledge: [
              {
                word: '复数的概念',
                meaning: '形如 a+bi 的数，i²=-1',
                order: 1,
                partOfSpeech: '几何与代数',
                example: '3+4i、-i 都是复数',
                explanation:
                  '【是什么】方程 x²=-1 没有实数解，引入 i（i²=-1），就有了复数 a+bi。【为什么】复数扩充了数系，让每个方程都有解。【结论】复数 z=a+bi（a 实部、b 虚部）；b=0 是实数，a=0 是纯虚数。【怎么用】两复数相等要求实部、虚部分别相等。',
                quiz: [
                  { stem: 'i² =？', options: ['-1', '1', '0', 'i'], answerIndex: 0 },
                  {
                    stem: '复数 a+bi 中，a 叫？',
                    options: ['实部', '虚部', '模', '辐角'],
                    answerIndex: 0,
                  },
                  {
                    stem: '纯虚数是？',
                    options: ['实部为 0 的复数', '虚部为 0 的复数', '实数', '虚数单位'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: '复数的四则运算',
                meaning: '复数的加减乘除，乘法用 i²=-1',
                order: 2,
                partOfSpeech: '几何与代数',
                example: '(1+i)(1-i)=2',
                explanation:
                  '【是什么】复数怎么加减乘除？【为什么】像多项式那样算，遇到 i² 就换成 -1。【结论】加减：实部虚部分别相加减；乘法：分配律展开，i²=-1；除法：分子分母同乘共轭复数。【怎么用】(a+bi)(a-bi)=a²+b² 是常用的化简结果。',
                quiz: [
                  { stem: '(1+i)(1-i) =？', options: ['2', '0', '1', '2i'], answerIndex: 0 },
                  {
                    stem: '(3+2i)+(1-i) =？',
                    options: ['4+i', '4-i', '2+i', '4+3i'],
                    answerIndex: 0,
                  },
                  {
                    stem: '复数除法常用方法是？',
                    options: ['分子分母同乘共轭复数', '直接除', '平方', '取对数'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: '复数的几何意义',
                meaning: '复数对应复平面上的点，模是到原点的距离',
                order: 3,
                partOfSpeech: '几何与代数',
                example: '复数 3+4i 对应点 (3,4)，模为 5',
                explanation:
                  '【是什么】复数 a+bi 可以看成平面上的点 (a,b)。【为什么】复平面把复数和点、向量一一对应起来。【结论】复数 z=a+bi 对应点 (a,b)，模 |z|=√(a²+b²)。【怎么用】复数的模就是它对应点到原点的距离。',
                quiz: [
                  {
                    stem: '复数 a+bi 对应平面上的点？',
                    options: ['(a,b)', '(b,a)', '(a,-b)', '(-a,b)'],
                    answerIndex: 0,
                  },
                  { stem: '复数 3+4i 的模是？', options: ['5', '7', '4', '3'], answerIndex: 0 },
                  {
                    stem: '复数的模 |z| 表示？',
                    options: ['对应点到原点的距离', '实部', '虚部', '辐角'],
                    answerIndex: 0,
                  },
                ],
              },
            ],
          },
          {
            title: '立体几何初步',
            order: 3,
            knowledge: [
              {
                word: '空间几何体的结构',
                meaning: '柱、锥、台、球的结构特征',
                order: 1,
                partOfSpeech: '几何与代数',
                example: '长方体是柱体，圆锥是锥体',
                explanation:
                  '【是什么】生活中的柱、锥、台、球，都有各自的几何特征。【为什么】认识空间几何体的结构，是研究它们的基础。【结论】柱体（上下底面平行）、锥体（一个顶点）、台体（截锥）、球。【怎么用】判断几何体类型，看底面形状和侧面。',
                quiz: [
                  { stem: '长方体属于？', options: ['柱体', '锥体', '台体', '球'], answerIndex: 0 },
                  { stem: '圆锥属于？', options: ['锥体', '柱体', '台体', '球'], answerIndex: 0 },
                  {
                    stem: '圆柱上下底面？',
                    options: ['平行且相等', '相交', '垂直', '一个点'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: '空间几何体的表面积和体积',
                meaning: '柱锥台球的表面积、体积公式',
                order: 2,
                partOfSpeech: '几何与代数',
                example: '球体积 V=4πR³/3',
                explanation:
                  '【是什么】几何体「表面积多大、占多大空间」怎么算？【为什么】柱体体积=底面积×高；锥体是柱体的 1/3；球体积有专门公式。【结论】V柱=Sh、V锥=Sh/3、V球=4πR³/3；表面积是侧面+底面。【怎么用】锥体体积的 1/3 是最容易忘的。',
                quiz: [
                  {
                    stem: '柱体体积公式是？',
                    options: ['V=Sh', 'V=Sh/3', 'V=4πR³/3', 'V=Sh/2'],
                    answerIndex: 0,
                  },
                  {
                    stem: '锥体体积是等底等高柱体的？',
                    options: ['1/3', '1/2', '1', '2 倍'],
                    answerIndex: 0,
                  },
                  {
                    stem: '球体积公式是？',
                    options: ['4πR³/3', 'πR³', '4πR²', '2πR³'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: '空间点、直线、平面的位置关系',
                meaning: '点线面的位置关系、公理',
                order: 3,
                partOfSpeech: '几何与代数',
                example: '两点确定一条直线，不共线三点确定一个平面',
                explanation:
                  '【是什么】空间里的点、线、面之间有哪些位置关系？【为什么】立体几何的公理是推理的基础。【结论】两点确定一直线；不共线三点确定一平面；直线与直线可平行、相交、异面。【怎么用】「异面直线」是空间特有的（不同在任一平面内），平面几何没有。',
                quiz: [
                  {
                    stem: '不共线的三点确定？',
                    options: ['一个平面', '一条直线', '一个点', '无数平面'],
                    answerIndex: 0,
                  },
                  {
                    stem: '空间两直线的位置关系不包括？',
                    options: ['异面', '平行', '相交', '重合'],
                    answerIndex: 0,
                  },
                  {
                    stem: '异面直线是指？',
                    options: ['不同在任何一个平面内', '平行', '相交', '垂直'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: '直线与平面平行',
                meaning: '线面平行的判定与性质',
                order: 4,
                partOfSpeech: '几何与代数',
                example: '直线平行于平面内一条直线，则线面平行',
                explanation:
                  '【是什么】一条直线和一个平面「平行」，怎么判断？【为什么】线面平行判定：平面外一条直线平行于平面内一条直线，则线面平行。【结论】判定：线线平行 ⇒ 线面平行；性质：线面平行 ⇒ 线线平行。【怎么用】证明线面平行，关键是「在平面内找一条与它平行的线」。',
                quiz: [
                  {
                    stem: '线面平行的判定是？',
                    options: ['线平行于面内一条直线', '线垂直于面内直线', '线与面相交', '线在面内'],
                    answerIndex: 0,
                  },
                  {
                    stem: '证明线面平行，通常？',
                    options: ['在面内找与它平行的线', '找垂线', '找交点', '求距离'],
                    answerIndex: 0,
                  },
                  {
                    stem: '线面平行的性质是？',
                    options: [
                      '过线的面与已知面交线平行于该线',
                      '线垂直于面',
                      '线在面内',
                      '线与面相交',
                    ],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: '直线与平面垂直',
                meaning: '线面垂直的判定与性质',
                order: 5,
                partOfSpeech: '几何与代数',
                example: '直线垂直于平面内两条相交直线，则线面垂直',
                explanation:
                  '【是什么】一条直线和一个平面「垂直」，怎么判断？【为什么】线面垂直判定：直线垂直于平面内两条相交直线。【结论】判定：线垂直于面内两相交线 ⇒ 线面垂直；性质：线面垂直 ⇒ 线垂直于面内任一直线。【怎么用】证明线面垂直要「两条相交直线」都垂直，少一条不行。',
                quiz: [
                  {
                    stem: '线面垂直的判定是？',
                    options: [
                      '线垂直于面内两条相交直线',
                      '线垂直于一条直线',
                      '线平行于面',
                      '线在面内',
                    ],
                    answerIndex: 0,
                  },
                  {
                    stem: '线面垂直判定的关键？',
                    options: ['两条相交直线', '一条直线', '三条平行线', '一个点'],
                    answerIndex: 0,
                  },
                  {
                    stem: '线面垂直的性质是？',
                    options: ['线垂直于面内任意直线', '线平行于面内直线', '线在面内', '线与面相交'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: '平面与平面的平行和垂直',
                meaning: '面面平行、面面垂直的判定',
                order: 6,
                partOfSpeech: '几何与代数',
                example: '一个平面内两条相交直线平行于另一平面，则面面平行',
                explanation:
                  '【是什么】两个平面平行或垂直，怎么判断？【为什么】面面平行：一平面内两相交直线都平行于另一平面；面面垂直：一平面过另一平面的垂线。【结论】面面平行、垂直的判定都「降维」到线面关系。【怎么用】面面问题转成线面问题，是立体几何的核心思路。',
                quiz: [
                  {
                    stem: '面面平行的判定是？',
                    options: [
                      '一平面内两相交直线都平行于另一平面',
                      '两平面相交',
                      '两平面有公共点',
                      '两平面垂直',
                    ],
                    answerIndex: 0,
                  },
                  {
                    stem: '面面垂直的判定是？',
                    options: ['一平面过另一平面的垂线', '两平面平行', '两平面相交', '两平面重合'],
                    answerIndex: 0,
                  },
                  {
                    stem: '立体几何的核心思路是？',
                    options: ['降维（面面转线面）', '升维', '只算体积', '只画图'],
                    answerIndex: 0,
                  },
                ],
              },
            ],
          },
          {
            title: '统计',
            order: 4,
            knowledge: [
              {
                word: '随机抽样',
                meaning: '简单随机抽样、分层抽样',
                order: 1,
                partOfSpeech: '概率与统计',
                example: '从全校抽 100 人调查身高',
                explanation:
                  '【是什么】要了解总体，不可能全查，得「抽样」。【为什么】简单随机抽样（抽签、随机数）保证公平；分层抽样按比例从各层抽取。【结论】抽样要保证「随机、等可能、有代表性」。【怎么用】分层抽样：各层样本数 = 总体样本数 ×（该层人数 ÷ 总人数）。',
                quiz: [
                  {
                    stem: '抽样方法不包括？',
                    options: ['简单随机抽样', '分层抽样', '系统抽样', '全面调查'],
                    answerIndex: 3,
                  },
                  {
                    stem: '分层抽样的特点是？',
                    options: ['按比例从各层抽取', '全部抽取', '只抽一层', '随机任取'],
                    answerIndex: 0,
                  },
                  {
                    stem: '抽样的基本原则是？',
                    options: ['随机、等可能、有代表性', '只抽好样本', '抽最大样本', '抽最小样本'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: '用样本估计总体',
                meaning: '用样本的平均数、方差估计总体',
                order: 2,
                partOfSpeech: '概率与统计',
                example: '样本平均数估计总体平均数',
                explanation:
                  '【是什么】抽了样本，怎么「推断」总体？【为什么】用样本的数字特征（平均数、中位数、方差）估计总体的对应特征。【结论】平均数反映平均水平，方差反映波动大小。【怎么用】方差越大数据越分散，越小越稳定。',
                quiz: [
                  {
                    stem: '反映数据平均水平的是？',
                    options: ['平均数', '方差', '极差', '众数'],
                    answerIndex: 0,
                  },
                  {
                    stem: '反映数据波动大小的是？',
                    options: ['方差', '平均数', '中位数', '众数'],
                    answerIndex: 0,
                  },
                  {
                    stem: '方差越大，数据越？',
                    options: ['分散', '集中', '稳定', '均匀'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: '频率分布直方图',
                meaning: '用直方图表示数据分布，频数、频率',
                order: 3,
                partOfSpeech: '概率与统计',
                example: '画身高分布的直方图',
                explanation:
                  '【是什么】一堆数据怎么「看」出分布规律？【为什么】分组后画频率分布直方图，直方图的高度 = 频率/组距，面积 = 频率。【结论】频率分布直方图直观展示数据分布；所有矩形面积和 = 1。【怎么用】众数、中位数、平均数都能从直方图大致估计。',
                quiz: [
                  {
                    stem: '频率分布直方图中，矩形面积表示？',
                    options: ['频率', '频数', '组距', '平均数'],
                    answerIndex: 0,
                  },
                  {
                    stem: '直方图所有矩形面积之和等于？',
                    options: ['1', '0', '样本数', '100'],
                    answerIndex: 0,
                  },
                  {
                    stem: '直方图的横轴表示？',
                    options: ['数据分组', '频率', '频数', '面积'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: '统计案例',
                meaning: '用统计知识解决实际问题',
                order: 4,
                partOfSpeech: '概率与统计',
                example: '调查学生视力、估计总体',
                explanation:
                  '【是什么】统计怎么用到实际？【为什么】从「设计抽样 → 收集数据 → 分析 → 推断」走完整流程。【结论】统计解决问题的流程：抽样、整理、分析、推断。【怎么用】统计是「用部分推断整体」的学问，抽样要科学才有说服力。',
                quiz: [
                  {
                    stem: '统计解决问题的第一步是？',
                    options: ['抽样', '画图', '求方差', '下结论'],
                    answerIndex: 0,
                  },
                  {
                    stem: '统计的本质是？',
                    options: ['用部分推断整体', '全查', '只看样本', '只看个别数据'],
                    answerIndex: 0,
                  },
                  {
                    stem: '统计推断是否可靠，取决于？',
                    options: ['抽样是否科学', '数据多少（唯一）', '画图好看', '计算快'],
                    answerIndex: 0,
                  },
                ],
              },
            ],
          },
          {
            title: '概率',
            order: 5,
            knowledge: [
              {
                word: '随机事件与样本空间',
                meaning: '随机事件、样本空间、基本事件',
                order: 1,
                partOfSpeech: '概率与统计',
                example: '掷骰子的样本空间 {1,2,3,4,5,6}',
                explanation:
                  '【是什么】掷骰子可能出现哪些结果？所有可能结果组成样本空间。【为什么】研究概率先要明确「可能发生什么」。【结论】样本空间是全部基本事件的集合；随机事件是样本空间的子集。【怎么用】明确样本空间是算概率的第一步。',
                quiz: [
                  {
                    stem: '样本空间是？',
                    options: ['全部基本事件的集合', '一个事件', '不可能事件', '空集'],
                    answerIndex: 0,
                  },
                  {
                    stem: '掷一枚骰子，样本空间元素个数是？',
                    options: ['6', '1', '36', '12'],
                    answerIndex: 0,
                  },
                  {
                    stem: '必然事件的概率是？',
                    options: ['1', '0', '1/2', '不确定'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: '古典概型',
                meaning: '等可能事件的概率，P(A)=m/n',
                order: 2,
                partOfSpeech: '概率与统计',
                example: '掷骰子出 3 的概率是 1/6',
                explanation:
                  '【是什么】每个基本事件等可能时，概率怎么算？【为什么】古典概型：有利事件数 ÷ 总事件数。【结论】P(A) = m/n（m 有利结果，n 总结果）。【怎么用】用古典概型要先判断「等可能」，再数出 m 和 n。',
                quiz: [
                  {
                    stem: '古典概型的概率公式是？',
                    options: ['P(A)=m/n', 'P(A)=n/m', 'P(A)=m·n', 'P(A)=1-m/n'],
                    answerIndex: 0,
                  },
                  {
                    stem: '掷骰子出偶数的概率是？',
                    options: ['1/2', '1/6', '1/3', '2/3'],
                    answerIndex: 0,
                  },
                  {
                    stem: '古典概型的前提是？',
                    options: ['基本事件等可能', '事件不独立', '样本无限', '事件相关'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: '概率的基本性质',
                meaning: '概率的范围、互斥事件、对立事件的概率',
                order: 3,
                partOfSpeech: '概率与统计',
                example: '互斥事件概率相加',
                explanation:
                  '【是什么】概率有哪些基本规律？【为什么】概率在 0~1 之间；互斥事件（不能同时发生）概率相加。【结论】0≤P(A)≤1；互斥：P(A∪B)=P(A)+P(B)；对立：P(A)+P(Ā)=1。【怎么用】「至少一个发生」常用对立事件算：1 - 都不发生的概率。',
                quiz: [
                  {
                    stem: '概率的取值范围是？',
                    options: ['[0,1]', '(0,1)', '[0,∞)', '(-∞,∞)'],
                    answerIndex: 0,
                  },
                  {
                    stem: '互斥事件 A、B，P(A∪B)=？',
                    options: ['P(A)+P(B)', 'P(A)·P(B)', 'P(A)-P(B)', '1'],
                    answerIndex: 0,
                  },
                  {
                    stem: '事件 A 与对立事件 Ā 的概率关系？',
                    options: ['和为 1', '积为 1', '相等', '差为 1'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: '事件的相互独立性',
                meaning: '两事件独立，P(AB)=P(A)P(B)',
                order: 4,
                partOfSpeech: '概率与统计',
                example: '两次掷骰子互不影响',
                explanation:
                  '【是什么】「掷两次骰子」第一次结果不影响第二次，两事件独立。【为什么】独立事件同时发生的概率 = 各自概率的乘积。【结论】A、B 独立 ⇔ P(AB)=P(A)·P(B)。【怎么用】「都发生」用乘法，「至少一个」用对立事件，别混。',
                quiz: [
                  {
                    stem: '独立事件 A、B 同时发生的概率？',
                    options: ['P(A)·P(B)', 'P(A)+P(B)', 'P(A)-P(B)', 'P(A)/P(B)'],
                    answerIndex: 0,
                  },
                  {
                    stem: '掷两次骰子都出 6 的概率是？',
                    options: ['1/36', '1/6', '1/12', '1/3'],
                    answerIndex: 0,
                  },
                  {
                    stem: '独立事件的含义是？',
                    options: ['互不影响', '互相影响', '必同时发生', '必不同时发生'],
                    answerIndex: 0,
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        name: '高二上册',
        order: 3,
        grade: 11,
        stage: 'senior',
        chapters: [
          {
            title: '空间向量与立体几何',
            order: 1,
            knowledge: [
              {
                word: '空间向量及其运算',
                meaning: '空间向量的加减、数乘、数量积',
                order: 1,
                partOfSpeech: '几何与代数',
                example: '空间向量的加减法与平面向量类似',
                explanation:
                  '【是什么】平面向量推广到空间，就是空间向量。【为什么】空间向量运算（加减、数乘、数量积）与平面向量完全一致。【结论】空间向量数量积 a·b=|a||b|cosθ，a·b=0 ⇔ a⊥b。【怎么用】空间向量是解决立体几何的「代数工具」。',
                quiz: [
                  {
                    stem: '空间向量的数量积公式是？',
                    options: ['|a||b|cosθ', '|a||b|sinθ', '|a|+|b|', '|a||b|'],
                    answerIndex: 0,
                  },
                  {
                    stem: '空间向量 a·b=0 表示？',
                    options: ['a⊥b', 'a∥b', 'a=b', '共线'],
                    answerIndex: 0,
                  },
                  {
                    stem: '空间向量与平面向量的运算？',
                    options: ['完全一致', '完全不同', '部分不同', '没有关系'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: '空间向量的坐标表示',
                meaning: '空间向量用 (x,y,z) 表示',
                order: 2,
                partOfSpeech: '几何与代数',
                example: 'a=(x1,y1,z1), b=(x2,y2,z2)',
                explanation:
                  '【是什么】空间向量也可以用坐标表示。【为什么】建立空间直角坐标系后，向量用 (x,y,z) 表示，运算变成坐标运算。【结论】a·b=x1x2+y1y2+z1z2，|a|=√(x1²+y1²+z1²)。【怎么用】坐标化是「几何转代数」的关键一步。',
                quiz: [
                  {
                    stem: '空间向量 a=(1,2,2) 的模是？',
                    options: ['3', '5', '√5', '9'],
                    answerIndex: 0,
                  },
                  {
                    stem: 'a=(1,0,0), b=(0,1,0)，则 a·b=？',
                    options: ['0', '1', '2', '-1'],
                    answerIndex: 0,
                  },
                  {
                    stem: '空间向量坐标化需要？',
                    options: ['建立空间直角坐标系', '画图', '求面积', '求体积'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: '用空间向量研究直线平面的位置关系',
                meaning: '用向量判断线线、线面、面面平行垂直',
                order: 3,
                partOfSpeech: '几何与代数',
                example: '两直线方向向量垂直，则两直线垂直',
                explanation:
                  '【是什么】证明线面平行、垂直，用向量更简单。【为什么】直线的方向向量、平面的法向量能刻画线面关系。【结论】线线垂直 ⇔ 方向向量垂直；线面垂直 ⇔ 方向向量平行于法向量；面面垂直 ⇔ 法向量垂直。【怎么用】把几何证明「翻译」成向量计算。',
                quiz: [
                  {
                    stem: '两直线垂直，等价于方向向量？',
                    options: ['垂直（点积为 0）', '平行', '相等', '共线'],
                    answerIndex: 0,
                  },
                  {
                    stem: '直线与平面垂直，直线的方向向量与平面法向量？',
                    options: ['平行', '垂直', '相等', '无关'],
                    answerIndex: 0,
                  },
                  {
                    stem: '平面的法向量是？',
                    options: ['垂直于平面的向量', '平行于平面的向量', '在平面内的向量', '任意向量'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: '用空间向量求空间角',
                meaning: '求异面直线角、线面角、二面角',
                order: 4,
                partOfSpeech: '几何与代数',
                example: '线面角 = 方向向量与法向量夹角的余角',
                explanation:
                  '【是什么】异面直线夹角、线面角、二面角怎么求？【为什么】用向量算夹角，再用关系转换。【结论】异面直线角 = 方向向量夹角；线面角 = 方向向量与法向量夹角的余角；二面角 = 法向量夹角（或其补角）。【怎么用】求角先找向量，算夹角的余弦，注意范围。',
                quiz: [
                  {
                    stem: '异面直线所成的角，等于两直线的？',
                    options: ['方向向量夹角', '法向量夹角', '方向向量与法向量夹角', '无关'],
                    answerIndex: 0,
                  },
                  {
                    stem: '线面角与方向向量和法向量夹角的关系是？',
                    options: ['互为余角', '相等', '互为补角', '无关'],
                    answerIndex: 0,
                  },
                  {
                    stem: '二面角可以用两个平面的？',
                    options: ['法向量夹角', '方向向量夹角', '任意向量', '边长'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: '用空间向量求距离',
                meaning: '求点到平面的距离等',
                order: 5,
                partOfSpeech: '几何与代数',
                example: '点到平面距离用向量投影求',
                explanation:
                  '【是什么】点到平面、点到直线的距离，用向量怎么求？【为什么】点到平面的距离等于「向量在法向量上的投影长度」。【结论】点到平面距离 d = |AP·n| / |n|（n 是法向量）。【怎么用】求距离：找点、找平面、求法向量、套公式。',
                quiz: [
                  {
                    stem: '点到平面的距离，等于向量在什么上的投影？',
                    options: ['法向量', '方向向量', '任意向量', '切线'],
                    answerIndex: 0,
                  },
                  {
                    stem: '求点到平面距离需要？',
                    options: ['平面的法向量', '平面面积', '平面周长', '体积'],
                    answerIndex: 0,
                  },
                  {
                    stem: '空间距离问题用向量求解的核心是？',
                    options: ['投影', '求面积', '求体积', '画图'],
                    answerIndex: 0,
                  },
                ],
              },
            ],
          },
          {
            title: '直线和圆的方程',
            order: 2,
            knowledge: [
              {
                word: '直线的倾斜角与斜率',
                meaning: '斜率 k = tanα，表示直线的倾斜程度',
                order: 1,
                partOfSpeech: '几何与代数',
                example: '倾斜角 45° 的直线斜率为 1',
                explanation:
                  '【是什么】直线「斜不斜」用什么表示？【为什么】倾斜角 α 的正切就是斜率 k，k=tanα。【结论】k = tanα = (y2-y1)/(x2-x1)；倾斜角 90° 时斜率不存在。【怎么用】两点求斜率，判断直线位置。',
                quiz: [
                  {
                    stem: '斜率 k 等于？',
                    options: ['tanα', 'sinα', 'cosα', 'cotα'],
                    answerIndex: 0,
                  },
                  {
                    stem: '倾斜角 45° 的直线斜率是？',
                    options: ['1', '0', '√3', '不存在'],
                    answerIndex: 0,
                  },
                  {
                    stem: '倾斜角 90°（竖直）的直线，斜率？',
                    options: ['不存在', '0', '1', '∞'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: '直线的方程',
                meaning: '点斜式、斜截式、一般式',
                order: 2,
                partOfSpeech: '几何与代数',
                example: 'y=kx+b 是斜截式',
                explanation:
                  '【是什么】一条直线怎么用方程表示？【为什么】点斜式 y-y0=k(x-x0)、斜截式 y=kx+b、一般式 Ax+By+C=0 是常见形式。【结论】知道一点和斜率，用点斜式；知道斜率和截距，用斜截式。【怎么用】三种形式能互相转化，按需选用。',
                quiz: [
                  {
                    stem: '斜截式是？',
                    options: ['y=kx+b', 'y-y0=k(x-x0)', 'Ax+By+C=0', 'x=my+n'],
                    answerIndex: 0,
                  },
                  {
                    stem: '点斜式是？',
                    options: ['y-y0=k(x-x0)', 'y=kx+b', 'Ax+By+C=0', 'y=kx'],
                    answerIndex: 0,
                  },
                  {
                    stem: '直线一般式是？',
                    options: ['Ax+By+C=0', 'y=kx+b', 'y-y0=k(x-x0)', 'x²+y²=r²'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: '两条直线的位置关系',
                meaning: '平行、垂直、相交的判定',
                order: 3,
                partOfSpeech: '几何与代数',
                example: '斜率相等则平行，斜率乘积 -1 则垂直',
                explanation:
                  '【是什么】两条直线平行、垂直、相交，怎么判断？【为什么】用斜率判断：k1=k2 平行，k1·k2=-1 垂直。【结论】平行：斜率相等；垂直：斜率乘积 -1；相交：斜率不等。【怎么用】垂直的条件「斜率乘积 -1」是高频考点。',
                quiz: [
                  {
                    stem: '两直线平行的条件是？',
                    options: ['斜率相等', '斜率乘积 -1', '截距相等', '斜率互为倒数'],
                    answerIndex: 0,
                  },
                  {
                    stem: '两直线垂直的条件是？',
                    options: ['斜率乘积 -1', '斜率相等', '斜率乘积 1', '截距相等'],
                    answerIndex: 0,
                  },
                  {
                    stem: '斜率 k1≠k2 的两直线？',
                    options: ['相交', '平行', '垂直', '重合'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: '圆的方程',
                meaning: '标准方程 (x-a)²+(y-b)²=r²',
                order: 4,
                partOfSpeech: '几何与代数',
                example: '圆心 (0,0)、半径 1 的圆 x²+y²=1',
                explanation:
                  '【是什么】圆怎么用方程表示？【为什么】到圆心距离等于半径的所有点组成圆。【结论】标准方程 (x-a)²+(y-b)²=r²，圆心 (a,b)、半径 r；一般式 x²+y²+Dx+Ey+F=0。【怎么用】配方把一般式化成标准式，读出圆心半径。',
                quiz: [
                  {
                    stem: '圆的标准方程是？',
                    options: ['(x-a)²+(y-b)²=r²', 'x²+y²=1', 'y=kx+b', 'x²/a²+y²/b²=1'],
                    answerIndex: 0,
                  },
                  {
                    stem: 'x²+y²=1 的圆心是？',
                    options: ['(0,0)', '(1,0)', '(0,1)', '(1,1)'],
                    answerIndex: 0,
                  },
                  {
                    stem: '圆 (x-2)²+(y+1)²=9 的半径是？',
                    options: ['3', '9', '2', '1'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: '直线与圆的位置关系',
                meaning: '相离、相切、相交，用圆心到直线距离判断',
                order: 5,
                partOfSpeech: '几何与代数',
                example: '圆心到直线距离 d 与半径 r 比较',
                explanation:
                  '【是什么】直线和圆相离、相切、相交，怎么判断？【为什么】比较圆心到直线的距离 d 与半径 r。【结论】d>r 相离、d=r 相切、d<r 相交。【怎么用】判断位置关系先求 d = |Ax0+By0+C|/√(A²+B²)。',
                quiz: [
                  {
                    stem: '直线与圆相切的条件是？',
                    options: [
                      '圆心到直线距离等于半径',
                      '距离大于半径',
                      '距离小于半径',
                      '与距离无关',
                    ],
                    answerIndex: 0,
                  },
                  {
                    stem: '直线与圆相交的条件是？',
                    options: ['圆心到直线距离小于半径', '等于半径', '大于半径', '无关'],
                    answerIndex: 0,
                  },
                  {
                    stem: '圆心到直线 Ax+By+C=0 的距离公式是？',
                    options: [
                      '|Ax0+By0+C|/√(A²+B²)',
                      '|Ax0+By0|/√(A²+B²)',
                      'Ax0+By0+C',
                      '√(A²+B²)',
                    ],
                    answerIndex: 0,
                  },
                ],
              },
            ],
          },
          {
            title: '圆锥曲线的方程',
            order: 3,
            knowledge: [
              {
                word: '椭圆及其标准方程',
                meaning: '到两定点距离之和为常数的点的轨迹',
                order: 1,
                partOfSpeech: '几何与代数',
                example: '椭圆 x²/a²+y²/b²=1 (a>b>0)',
                explanation:
                  '【是什么】「到两个定点距离之和是常数」的点的轨迹，就是椭圆。【为什么】这是椭圆的定义（两个定点是焦点）。【结论】标准方程 x²/a²+y²/b²=1（焦点在 x 轴，a>b>0），a²=b²+c²。【怎么用】椭圆定义是「绳子画椭圆」的数学化。',
                quiz: [
                  {
                    stem: '椭圆的定义是？',
                    options: [
                      '到两定点距离之和为常数',
                      '到定点距离相等',
                      '到定直线距离相等',
                      '到两点距离之差为常数',
                    ],
                    answerIndex: 0,
                  },
                  {
                    stem: '椭圆 x²/9+y²/4=1 的 a=？',
                    options: ['3', '2', '9', '4'],
                    answerIndex: 0,
                  },
                  {
                    stem: '椭圆 a、b、c 的关系是？',
                    options: ['a²=b²+c²', 'b²=a²+c²', 'c²=a²+b²', 'a=b+c'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: '椭圆的几何性质',
                meaning: '范围、对称性、顶点、离心率',
                order: 2,
                partOfSpeech: '几何与代数',
                example: '离心率 e=c/a (0<e<1)',
                explanation:
                  '【是什么】椭圆的形状由什么决定？【为什么】离心率 e=c/a 刻画椭圆的「扁」程度，e 越小越接近圆。【结论】椭圆关于坐标轴对称，顶点 (±a,0)、(0,±b)，离心率 e=c/a。【怎么用】离心率越接近 1，椭圆越扁；越接近 0 越圆。',
                quiz: [
                  {
                    stem: '椭圆的离心率 e=？',
                    options: ['c/a', 'a/c', 'b/a', 'c/b'],
                    answerIndex: 0,
                  },
                  {
                    stem: '椭圆的离心率范围是？',
                    options: ['(0,1)', '(1,+∞)', '[0,1]', '任意'],
                    answerIndex: 0,
                  },
                  {
                    stem: '离心率越接近 0，椭圆越？',
                    options: ['接近圆', '扁', '长', '窄'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: '双曲线及其标准方程',
                meaning: '到两定点距离之差的绝对值为常数的点的轨迹',
                order: 3,
                partOfSpeech: '几何与代数',
                example: '双曲线 x²/a²-y²/b²=1',
                explanation:
                  '【是什么】「到两个定点距离之差的绝对值是常数」的点的轨迹，就是双曲线。【为什么】与椭圆（和）相对，双曲线是「差」为常数。【结论】标准方程 x²/a²-y²/b²=1，c²=a²+b²。【怎么用】双曲线有两支，定义里的「绝对值」别漏。',
                quiz: [
                  {
                    stem: '双曲线的定义是？',
                    options: [
                      '到两定点距离之差为常数',
                      '到两定点距离之和为常数',
                      '到定点距离相等',
                      '到定直线距离相等',
                    ],
                    answerIndex: 0,
                  },
                  {
                    stem: '双曲线 x²/a²-y²/b²=1，c、a、b 关系是？',
                    options: ['c²=a²+b²', 'a²=b²+c²', 'b²=a²+c²', 'c=a+b'],
                    answerIndex: 0,
                  },
                  {
                    stem: '双曲线有几支？',
                    options: ['两支', '一支', '三支', '无分支'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: '双曲线的几何性质',
                meaning: '渐近线、离心率',
                order: 4,
                partOfSpeech: '几何与代数',
                example: '双曲线渐近线 y=±(b/a)x',
                explanation:
                  '【是什么】双曲线有个特殊性质——渐近线。【为什么】双曲线向远处延伸时，越来越接近两条直线（渐近线），但永不相交。【结论】渐近线 y=±(b/a)x；离心率 e=c/a (e>1)。【怎么用】双曲线离心率恒大于 1，渐近线是重要考点。',
                quiz: [
                  {
                    stem: '双曲线的离心率范围是？',
                    options: ['(1,+∞)', '(0,1)', '[0,1]', '任意'],
                    answerIndex: 0,
                  },
                  {
                    stem: '双曲线的渐近线是？',
                    options: ['双曲线无限接近但不交的直线', '对称轴', '顶点连线', '焦点连线'],
                    answerIndex: 0,
                  },
                  {
                    stem: '双曲线 x²/a²-y²/b²=1 的渐近线是？',
                    options: ['y=±(b/a)x', 'y=±(a/b)x', 'y=±x', 'x=±a'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: '抛物线及其标准方程',
                meaning: '到定点与定直线距离相等的点的轨迹',
                order: 5,
                partOfSpeech: '几何与代数',
                example: '抛物线 y²=2px',
                explanation:
                  '【是什么】「到一个定点和一条定直线距离相等」的点的轨迹，就是抛物线。【为什么】定点是焦点、定直线是准线。【结论】标准方程 y²=2px（焦点在 x 轴正半轴）。【怎么用】抛物线是「到焦点和准线距离相等」的集合。',
                quiz: [
                  {
                    stem: '抛物线的定义是？',
                    options: [
                      '到定点与定直线距离相等',
                      '到两定点距离之和为常数',
                      '到两定点距离之差为常数',
                      '到定点距离为常数',
                    ],
                    answerIndex: 0,
                  },
                  {
                    stem: '抛物线 y²=2px 的开口方向？',
                    options: ['向右', '向左', '向上', '向下'],
                    answerIndex: 0,
                  },
                  {
                    stem: '抛物线的焦点和准线？',
                    options: ['焦点是定点，准线是定直线', '都是直线', '都是点', '无关'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: '抛物线的几何性质',
                meaning: '范围、对称性、焦点、准线',
                order: 6,
                partOfSpeech: '几何与代数',
                example: '抛物线 y²=2px 焦点 (p/2,0)，准线 x=-p/2',
                explanation:
                  '【是什么】抛物线有哪些几何性质？【为什么】抛物线关于对称轴对称，焦点和准线位置由 p 决定。【结论】y²=2px：焦点 (p/2,0)，准线 x=-p/2，开口由符号定。【怎么用】抛物线上点到焦点的距离 = 到准线的距离（定义）。',
                quiz: [
                  {
                    stem: '抛物线 y²=2px 的焦点是？',
                    options: ['(p/2,0)', '(0,p/2)', '(p,0)', '(0,p)'],
                    answerIndex: 0,
                  },
                  {
                    stem: '抛物线上点到焦点的距离等于？',
                    options: ['到准线的距离', '到顶点的距离', '到原点的距离', '到对称轴的距离'],
                    answerIndex: 0,
                  },
                  {
                    stem: '抛物线是轴对称图形吗？',
                    options: ['是', '不是', '不确定', '只有中心对称'],
                    answerIndex: 0,
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        name: '高二下册',
        order: 4,
        grade: 11,
        stage: 'senior',
        chapters: [
          {
            title: '数列',
            order: 1,
            knowledge: [
              {
                word: '数列的概念',
                meaning: '按一定顺序排列的一列数',
                order: 1,
                partOfSpeech: '函数',
                example: '1, 3, 5, 7, ... 是数列',
                explanation:
                  '【是什么】1、3、5、7、… 这样按顺序排的一列数，就是数列。【为什么】数列可以看成「定义在正整数上的函数」，第 n 项是 an。【结论】数列的通项公式 an 表示第 n 项。【怎么用】已知通项公式能求任意一项。',
                quiz: [
                  {
                    stem: '数列是？',
                    options: ['按顺序排的一列数', '一个数', '无序的数', '任意集合'],
                    answerIndex: 0,
                  },
                  { stem: '数列的第 n 项记作？', options: ['an', 'a', 'n', 'Sn'], answerIndex: 0 },
                  {
                    stem: '通项公式的作用是？',
                    options: ['求任意一项', '求总和', '求平均数', '求最大值'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: '等差数列',
                meaning: '每一项与前一项的差为常数的数列',
                order: 2,
                partOfSpeech: '函数',
                example: '2, 5, 8, 11, ... 公差 3',
                explanation:
                  '【是什么】2、5、8、11 每项比前一项多 3，这就是等差数列。【为什么】相邻两项的差恒定，这个差叫公差 d。【结论】通项 an = a1 + (n-1)d。【怎么用】已知首项和公差，能求任意项；已知两项能反求公差。',
                quiz: [
                  {
                    stem: '等差数列的定义是？',
                    options: ['相邻两项差为常数', '相邻两项比为常数', '每项相等', '每项递增'],
                    answerIndex: 0,
                  },
                  {
                    stem: '等差数列通项公式是？',
                    options: ['an=a1+(n-1)d', 'an=a1·q^(n-1)', 'an=a1+d', 'an=n·d'],
                    answerIndex: 0,
                  },
                  {
                    stem: '等差数列 2,5,8,... 的公差是？',
                    options: ['3', '2', '5', '1'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: '等差数列的前 n 项和',
                meaning: 'Sn = n(a1+an)/2，倒序相加法',
                order: 3,
                partOfSpeech: '函数',
                example: '1+2+3+...+100 = 5050',
                explanation:
                  '【是什么】等差数列前 n 项怎么快速求和？【为什么】首尾配对（倒序相加），每对和相等。【结论】Sn = n(a1+an)/2 = na1 + n(n-1)d/2。【怎么用】「高斯求和」就是它：1+...+100 = 100×101/2 = 5050。',
                quiz: [
                  {
                    stem: '等差数列前 n 项和公式是？',
                    options: ['n(a1+an)/2', 'n(a1+an)', 'a1+an', 'n·a1'],
                    answerIndex: 0,
                  },
                  {
                    stem: '1+2+...+100 =？',
                    options: ['5050', '5000', '5500', '10000'],
                    answerIndex: 0,
                  },
                  {
                    stem: '等差数列求和方法叫？',
                    options: ['倒序相加', '错位相减', '分组求和', '裂项'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: '等比数列',
                meaning: '每一项与前一项的比为常数的数列',
                order: 4,
                partOfSpeech: '函数',
                example: '2, 4, 8, 16, ... 公比 2',
                explanation:
                  '【是什么】2、4、8、16 每项是前一项的 2 倍，这就是等比数列。【为什么】相邻两项的比恒定，这个比叫公比 q。【结论】通项 an = a1·q^(n-1)。【怎么用】等比数列的项增长（或衰减）很快。',
                quiz: [
                  {
                    stem: '等比数列的定义是？',
                    options: ['相邻两项比为常数', '相邻两项差为常数', '每项相等', '每项递增'],
                    answerIndex: 0,
                  },
                  {
                    stem: '等比数列通项公式是？',
                    options: ['an=a1·q^(n-1)', 'an=a1+(n-1)d', 'an=a1·q', 'an=n·q'],
                    answerIndex: 0,
                  },
                  {
                    stem: '等比数列 2,4,8,... 的公比是？',
                    options: ['2', '4', '8', '1'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: '等比数列的前 n 项和',
                meaning: 'Sn = a1(1-q^n)/(1-q)，错位相减法',
                order: 5,
                partOfSpeech: '函数',
                example: '1+2+4+8+...+2^(n-1) = 2^n-1',
                explanation:
                  '【是什么】等比数列前 n 项怎么求和？【为什么】用「错位相减」：Sn 和 qSn 相减，中间项抵消。【结论】q≠1 时 Sn = a1(1-q^n)/(1-q)。【怎么用】q=1 时是常数列，Sn=na1。',
                quiz: [
                  {
                    stem: '等比数列前 n 项和公式（q≠1）是？',
                    options: ['a1(1-q^n)/(1-q)', 'n(a1+an)/2', 'a1·q^n', 'a1/(1-q)'],
                    answerIndex: 0,
                  },
                  {
                    stem: '等比数列求和方法叫？',
                    options: ['错位相减', '倒序相加', '分组求和', '裂项'],
                    answerIndex: 0,
                  },
                  {
                    stem: '1+2+4+8（共 4 项）的和是？',
                    options: ['15', '16', '14', '31'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: '数列的递推与通项',
                meaning: '由递推关系求通项、数列求和',
                order: 6,
                partOfSpeech: '函数',
                example: '累加法、累乘法、裂项求和',
                explanation:
                  '【是什么】有的数列不给通项，给「递推关系」（如 an = an-1 + d），怎么求通项？【为什么】累加法（差）、累乘法（商）、构造法把递推化成等差等比。【结论】递推求通项常用：累加、累乘、构造等比。【怎么用】裂项相消、分组求和是数列求和常见技巧。',
                quiz: [
                  {
                    stem: '由 an-a(n-1)=d 求通项，用？',
                    options: ['累加法', '累乘法', '构造法', '错位相减'],
                    answerIndex: 0,
                  },
                  {
                    stem: '由 an/a(n-1)=q 求通项，用？',
                    options: ['累乘法', '累加法', '裂项', '分组'],
                    answerIndex: 0,
                  },
                  {
                    stem: '数列求和常用方法不包括？',
                    options: ['裂项相消', '错位相减', '分组求和', '求导'],
                    answerIndex: 3,
                  },
                ],
              },
            ],
          },
          {
            title: '一元函数的导数及其应用',
            order: 2,
            knowledge: [
              {
                word: '导数的概念',
                meaning: "瞬时变化率，f'(x)=lim(Δy/Δx)",
                order: 1,
                partOfSpeech: '函数',
                example: '瞬时速度是位移的导数',
                explanation:
                  "【是什么】「某一瞬间」的变化率，就是导数。【为什么】平均变化率 Δy/Δx 让 Δx→0，极限就是瞬时变化率。【结论】导数 f'(x) = lim(Δx→0) [f(x+Δx)-f(x)]/Δx。【怎么用】瞬时速度 = 位移对时间的导数。",
                quiz: [
                  {
                    stem: '导数的本质是？',
                    options: ['瞬时变化率', '平均变化率', '总量', '斜率'],
                    answerIndex: 0,
                  },
                  {
                    stem: '瞬时速度是位移对时间的？',
                    options: ['导数', '积分', '平均', '差'],
                    answerIndex: 0,
                  },
                  {
                    stem: '导数符号是？',
                    options: ["f'(x)", 'f(x)', '∫f(x)', 'Δf'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: '导数的几何意义',
                meaning: "f'(x0) 是曲线在点 (x0, f(x0)) 处切线的斜率",
                order: 2,
                partOfSpeech: '函数',
                example: 'y=x² 在 x=1 处切线斜率 2',
                explanation:
                  "【是什么】导数在图像上是什么意思？【为什么】f'(x0) 等于曲线在该点切线的斜率。【结论】切线斜率 k = f'(x0)，切线方程 y-f(x0)=f'(x0)(x-x0)。【怎么用】求切线：先求导数值（斜率），再用点斜式写方程。",
                quiz: [
                  {
                    stem: "f'(x0) 的几何意义是？",
                    options: ['切线的斜率', '曲线长度', '面积', '距离'],
                    answerIndex: 0,
                  },
                  {
                    stem: '切线斜率 k 等于？',
                    options: ["f'(x0)", 'f(x0)', 'x0', 'f(x0)-x0'],
                    answerIndex: 0,
                  },
                  {
                    stem: '求切线方程第一步？',
                    options: ['求导数值（斜率）', '求面积', '求积分', '画图'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: '基本初等函数的导数',
                meaning: "(x^n)'=nx^(n-1) 等基本求导公式",
                order: 3,
                partOfSpeech: '函数',
                example: "(x²)'=2x",
                explanation:
                  "【是什么】常见函数的导数有固定公式。【为什么】这些基本公式是求导的基础，要熟记。【结论】(x^n)'=nx^(n-1)，(sinx)'=cosx，(cosx)'=-sinx，(e^x)'=e^x，(lnx)'=1/x。【怎么用】求导先看是哪类函数，套对应公式。",
                quiz: [
                  { stem: "(x²)' =？", options: ['2x', 'x', '2', 'x²'], answerIndex: 0 },
                  {
                    stem: "(sinx)' =？",
                    options: ['cosx', '-cosx', 'sinx', '-sinx'],
                    answerIndex: 0,
                  },
                  { stem: "(e^x)' =？", options: ['e^x', 'x·e^x', '1/e^x', 'lnx'], answerIndex: 0 },
                ],
              },
              {
                word: '导数的四则运算法则',
                meaning: "(u±v)'=u'±v'，(uv)'=u'v+uv' 等",
                order: 4,
                partOfSpeech: '函数',
                example: "(x²+2x)' = 2x+2",
                explanation:
                  "【是什么】两个函数的和、差、积、商的导数怎么求？【为什么】有四则运算法则。【结论】(u±v)'=u'±v'，(uv)'=u'v+uv'，(u/v)'=(u'v-uv')/v²。【怎么用】复合函数求导还有链式法则（外层导数×内层导数）。",
                quiz: [
                  {
                    stem: "(u+v)' =？",
                    options: ["u'+v'", "u'-v'", "u'v", "u'v+uv'"],
                    answerIndex: 0,
                  },
                  {
                    stem: "(uv)' =？",
                    options: ["u'v+uv'", "u'v-uv'", "u'+v'", "u'v'"],
                    answerIndex: 0,
                  },
                  {
                    stem: "(u/v)' =？",
                    options: ["(u'v-uv')/v²", "u'/v'", "u'v+uv'", "u'v-uv'"],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: '利用导数研究函数的单调性',
                meaning: "f'(x)>0 递增，f'(x)<0 递减",
                order: 5,
                partOfSpeech: '函数',
                example: 'y=x² 在 x>0 递增（导数 2x>0）',
                explanation:
                  "【是什么】用导数怎么判断函数增减？【为什么】导数正 → 函数上升，导数负 → 函数下降。【结论】f'(x)>0 区间上递增，f'(x)<0 区间上递减。【怎么用】求单调区间：先求导，解 f'(x)>0 和 f'(x)<0。",
                quiz: [
                  {
                    stem: "f'(x)>0 时函数？",
                    options: ['单调递增', '单调递减', '不增不减', '不确定'],
                    answerIndex: 0,
                  },
                  {
                    stem: "f'(x)<0 时函数？",
                    options: ['单调递减', '单调递增', '不增不减', '不确定'],
                    answerIndex: 0,
                  },
                  {
                    stem: '求单调区间的第一步？',
                    options: ['求导', '求积分', '画图', '代入'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: '利用导数研究函数的极值和最值',
                meaning: '导数变号处取得极值，比较端点求最值',
                order: 6,
                partOfSpeech: '函数',
                example: 'y=x² 在 x=0 取极小值 0',
                explanation:
                  "【是什么】函数的「峰」「谷」（极值）、最大最小值怎么求？【为什么】极值点处导数为 0 且导数变号。【结论】极值：f'(x)=0 且左右变号；最值：比较极值和端点值。【怎么用】求最值：求导 → 找极值点 → 与端点比较。",
                quiz: [
                  {
                    stem: '极值点处，导数？',
                    options: ['为 0 且变号', '为 0 不变号', '不为 0', '不存在'],
                    answerIndex: 0,
                  },
                  {
                    stem: '求函数最值，要比较？',
                    options: ['极值和端点值', '只有极值', '只有端点', '导数符号'],
                    answerIndex: 0,
                  },
                  {
                    stem: "f'(x) 从正变负，该点是？",
                    options: ['极大值点', '极小值点', '不是极值点', '拐点'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: '导数的综合应用',
                meaning: '用导数解决不等式证明、恒成立等问题',
                order: 7,
                partOfSpeech: '函数',
                example: '证明 f(x)≥0 可用导数求最小值',
                explanation:
                  '【是什么】导数能解决哪些难题？【为什么】不等式证明、恒成立、零点个数都可化归为函数最值问题。【结论】证明 f(x)≥0 常用「求 f 的最小值 ≥0」；恒成立转化为最值。【怎么用】「用导数研究函数 → 求最值 → 解决问题」是压轴题的通用套路。',
                quiz: [
                  {
                    stem: '证明 f(x)≥0 恒成立，可转化为？',
                    options: ['f(x) 最小值 ≥0', 'f(x) 最大值 ≥0', 'f(x) 最小值 ≤0', 'f(x)=0'],
                    answerIndex: 0,
                  },
                  {
                    stem: '导数综合题的核心思路是？',
                    options: ['求导研究函数求最值', '直接代值', '画图', '猜测'],
                    answerIndex: 0,
                  },
                  {
                    stem: '研究函数零点个数，常用？',
                    options: ['导数研究单调性和最值', '直接代入', '求积分', '画圆'],
                    answerIndex: 0,
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        name: '高三上册',
        order: 5,
        grade: 12,
        stage: 'senior',
        chapters: [
          {
            title: '计数原理',
            order: 1,
            knowledge: [
              {
                word: '分类加法与分步乘法计数原理',
                meaning: '分类相加、分步相乘',
                order: 1,
                partOfSpeech: '概率与统计',
                example: '从 3 条路线或 2 种交通工具选一种，共 3+2=5 种',
                explanation:
                  '【是什么】做一件事有多少种方法，怎么数？【为什么】分类（要么这样要么那样）用加法；分步（先做这再做那）用乘法。【结论】分类加法：N=m1+m2+...；分步乘法：N=m1×m2×...。【怎么用】「或」对应加、「且」对应乘，别混。',
                quiz: [
                  { stem: '分类用？', options: ['加法', '乘法', '除法', '减法'], answerIndex: 0 },
                  { stem: '分步用？', options: ['乘法', '加法', '除法', '减法'], answerIndex: 0 },
                  {
                    stem: '从 3 条路或 2 种车选一种，共几种？',
                    options: ['5', '6', '3', '2'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: '排列',
                meaning: '从 n 个中取 m 个排顺序，A(n,m)=n!/(n-m)!',
                order: 2,
                partOfSpeech: '概率与统计',
                example: '3 人站一排有 6 种站法',
                explanation:
                  '【是什么】「顺序重要」的选取叫排列。【为什么】第一个位置 n 种、第二个 n-1 种……相乘。【结论】排列数 A(n,m) = n(n-1)...(n-m+1) = n!/(n-m)!。【怎么用】排列讲究顺序，比如「排队」「排座位」。',
                quiz: [
                  { stem: '排列数 A(3,3) =？', options: ['6', '3', '9', '27'], answerIndex: 0 },
                  {
                    stem: 'A(n,m) 的公式是？',
                    options: ['n!/(n-m)!', 'n!/m!', 'n!/(m!(n-m)!)', 'n^m'],
                    answerIndex: 0,
                  },
                  { stem: '排列讲究？', options: ['顺序', '数量', '种类', '无关'], answerIndex: 0 },
                ],
              },
              {
                word: '组合',
                meaning: '从 n 个中取 m 个（不排顺序），C(n,m)=n!/[m!(n-m)!]',
                order: 3,
                partOfSpeech: '概率与统计',
                example: '从 5 人中选 3 人有 C(5,3)=10 种',
                explanation:
                  '【是什么】「顺序不重要」的选取叫组合。【为什么】组合数 = 排列数 ÷ 顺序的重复数。【结论】组合数 C(n,m) = n!/[m!(n-m)!]。【怎么用】「选人」「选物品」不问顺序，用组合。',
                quiz: [
                  {
                    stem: 'C(n,m) 的公式是？',
                    options: ['n!/[m!(n-m)!]', 'n!/(n-m)!', 'n!/m!', 'n^m'],
                    answerIndex: 0,
                  },
                  { stem: 'C(5,3) =？', options: ['10', '60', '20', '15'], answerIndex: 0 },
                  {
                    stem: '组合不讲究？',
                    options: ['顺序', '数量', '种类', '大小'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: '二项式定理',
                meaning: '(a+b)^n 的展开式',
                order: 4,
                partOfSpeech: '概率与统计',
                example: '(a+b)² = a²+2ab+b²',
                explanation:
                  '【是什么】(a+b)^n 展开是什么样？【为什么】展开式每项的系数就是组合数 C(n,k)。【结论】(a+b)^n = Σ C(n,k) a^(n-k) b^k，第 k+1 项系数 C(n,k)。【怎么用】通项公式 T(k+1)=C(n,k)a^(n-k)b^k 求指定项。',
                quiz: [
                  {
                    stem: '(a+b)² 展开是？',
                    options: ['a²+2ab+b²', 'a²+b²', 'a²-2ab+b²', 'a²+ab+b²'],
                    answerIndex: 0,
                  },
                  {
                    stem: '二项展开式的系数是？',
                    options: ['组合数 C(n,k)', '排列数', '幂', '阶乘'],
                    answerIndex: 0,
                  },
                  {
                    stem: '(a+b)^n 的通项公式是？',
                    options: ['C(n,k)a^(n-k)b^k', 'a^n b^k', 'C(n,k)', 'n!'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: '计数原理的应用',
                meaning: '用排列组合解决实际问题',
                order: 5,
                partOfSpeech: '概率与统计',
                example: '分组、分配、相邻、不相邻问题',
                explanation:
                  '【是什么】排列组合怎么用到实际？【为什么】相邻问题「捆绑」，不相邻问题「插空」，分组分配要注意均分。【结论】常用方法：捆绑法、插空法、隔板法。【怎么用】「至少一个」常用「总的 - 都不满足」或插空。',
                quiz: [
                  {
                    stem: '相邻问题用？',
                    options: ['捆绑法', '插空法', '隔板法', '直接算'],
                    answerIndex: 0,
                  },
                  {
                    stem: '不相邻问题用？',
                    options: ['插空法', '捆绑法', '隔板法', '直接算'],
                    answerIndex: 0,
                  },
                  {
                    stem: '「至少一个」问题常用？',
                    options: ['对立事件（总的-都不）', '直接算', '捆绑', '插空'],
                    answerIndex: 0,
                  },
                ],
              },
            ],
          },
          {
            title: '随机变量及其分布',
            order: 2,
            knowledge: [
              {
                word: '离散型随机变量及其分布列',
                meaning: '随机变量的取值及其概率',
                order: 1,
                partOfSpeech: '概率与统计',
                example: '掷骰子点数 X 的分布列',
                explanation:
                  '【是什么】把随机结果「量化」成变量 X，X 的取值及概率就是分布列。【为什么】分布列完整描述随机变量的规律。【结论】分布列满足：每个概率 ≥0，所有概率和 =1。【怎么用】写分布列：列取值 → 算每个概率 → 检验和为 1。',
                quiz: [
                  {
                    stem: '分布列所有概率之和等于？',
                    options: ['1', '0', '2', '不确定'],
                    answerIndex: 0,
                  },
                  {
                    stem: '离散型随机变量是？',
                    options: ['取值可列的变量', '连续取值', '只能取一个值', '无限小数'],
                    answerIndex: 0,
                  },
                  {
                    stem: '写分布列最后要？',
                    options: ['检验概率和为 1', '求平均数', '画图', '求方差'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: '二项分布',
                meaning: 'n 次独立重复试验中成功的次数，X~B(n,p)',
                order: 2,
                partOfSpeech: '概率与统计',
                example: '抛硬币 10 次，正面次数 X~B(10, 0.5)',
                explanation:
                  '【是什么】n 次独立重复试验，每次成功概率 p，成功次数 X 服从二项分布。【为什么】恰好 k 次成功：C(n,k) p^k (1-p)^(n-k)。【结论】X~B(n,p)，P(X=k)=C(n,k)p^k(1-p)^(n-k)。【怎么用】「重复 n 次、每次成功概率 p」就是二项分布。',
                quiz: [
                  {
                    stem: '二项分布记为？',
                    options: ['X~B(n,p)', 'X~N(μ,σ²)', 'X~H(n,M,N)', 'X~P(λ)'],
                    answerIndex: 0,
                  },
                  {
                    stem: '二项分布 P(X=k) 公式是？',
                    options: ['C(n,k)p^k(1-p)^(n-k)', 'p^k', 'C(n,k)', 'n·p'],
                    answerIndex: 0,
                  },
                  {
                    stem: '二项分布的前提是？',
                    options: ['n 次独立重复试验', '一次试验', '不重复', '连续变量'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: '超几何分布',
                meaning: '不放回抽样中抽到特定类的个数',
                order: 3,
                partOfSpeech: '概率与统计',
                example: '从 10 件含 3 件次品中抽 2 件，次品数 X',
                explanation:
                  '【是什么】不放回抽样，抽到「特定类」的个数服从超几何分布。【为什么】组合数计算：C(M,k)·C(N-M,n-k)/C(N,n)。【结论】超几何分布用于「不放回」抽样，与二项分布（放回/独立）相对。【怎么用】题目说「不放回抽取」，就用超几何。',
                quiz: [
                  {
                    stem: '超几何分布用于？',
                    options: ['不放回抽样', '放回抽样', '独立试验', '连续变量'],
                    answerIndex: 0,
                  },
                  {
                    stem: '不放回抽样，抽到特定类的个数服从？',
                    options: ['超几何分布', '二项分布', '正态分布', '均匀分布'],
                    answerIndex: 0,
                  },
                  {
                    stem: '超几何分布与二项分布的区别是？',
                    options: ['放回 vs 不放回', '离散 vs 连续', '有界 vs 无界', '无关'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: '正态分布',
                meaning: '钟形曲线，X~N(μ,σ²)',
                order: 4,
                partOfSpeech: '概率与统计',
                example: '身高、成绩常服从正态分布',
                explanation:
                  '【是什么】很多自然量（身高、成绩）的分布呈「钟形」，这就是正态分布。【为什么】大量独立微小因素叠加，结果近似正态（中心极限定理）。【结论】X~N(μ,σ²)，图像关于 x=μ 对称，σ 越大越「矮胖」。【怎么用】「3σ 原则」：几乎全部数据落在 μ±3σ 内。',
                quiz: [
                  {
                    stem: '正态分布记为？',
                    options: ['X~N(μ,σ²)', 'X~B(n,p)', 'X~P(λ)', 'X~H(n,M,N)'],
                    answerIndex: 0,
                  },
                  {
                    stem: '正态分布图像关于？',
                    options: ['x=μ 对称', '原点对称', 'y 轴对称', 'x=σ 对称'],
                    answerIndex: 0,
                  },
                  {
                    stem: '正态分布的图像形状是？',
                    options: ['钟形', '直线', '抛物线', '双曲线'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: '随机变量的期望与方差',
                meaning: 'E(X)=Σx_i·p_i，方差反映离散程度',
                order: 5,
                partOfSpeech: '概率与统计',
                example: '二项分布 X~B(n,p) 的期望 np',
                explanation:
                  '【是什么】随机变量的「平均值」和「波动」怎么算？【为什么】期望是「加权平均」，方差是「偏离期望的平方的平均」。【结论】E(X)=Σxi·pi；D(X)=Σ(xi-E(X))²·pi；二项分布 E(X)=np、D(X)=np(1-p)。【怎么用】期望反映中心位置，方差反映波动大小。',
                quiz: [
                  {
                    stem: '期望 E(X) 的公式是？',
                    options: ['Σxi·pi', 'Σxi', 'Σpi', 'Σxi²'],
                    answerIndex: 0,
                  },
                  {
                    stem: '二项分布 X~B(n,p) 的期望是？',
                    options: ['np', 'p', 'n', 'n/p'],
                    answerIndex: 0,
                  },
                  {
                    stem: '方差反映？',
                    options: ['离散程度', '中心位置', '最大值', '总数'],
                    answerIndex: 0,
                  },
                ],
              },
            ],
          },
          {
            title: '成对数据的统计分析',
            order: 3,
            knowledge: [
              {
                word: '变量间的相关关系',
                meaning: '正相关、负相关、散点图',
                order: 1,
                partOfSpeech: '概率与统计',
                example: '身高与体重正相关',
                explanation:
                  '【是什么】两个变量之间有「趋势」吗？【为什么】散点图看趋势：一个增大另一个也增大是正相关，反着是负相关。【结论】正相关（同向）、负相关（反向）、无相关。【怎么用】画散点图是判断相关关系的第一步。',
                quiz: [
                  {
                    stem: '一个变量增大另一个也增大，是？',
                    options: ['正相关', '负相关', '无相关', '因果'],
                    answerIndex: 0,
                  },
                  {
                    stem: '一个变量增大另一个减小，是？',
                    options: ['负相关', '正相关', '无相关', '因果'],
                    answerIndex: 0,
                  },
                  {
                    stem: '判断相关关系，先？',
                    options: ['画散点图', '求平均数', '求方差', '求导数'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: '线性回归方程',
                meaning: '用最小二乘法求回归直线',
                order: 2,
                partOfSpeech: '概率与统计',
                example: '回归直线 ŷ=bx+a',
                explanation:
                  '【是什么】两个变量近似线性相关，怎么「拟合」一条直线？【为什么】最小二乘法：使各点到直线的距离平方和最小。【结论】回归方程 ŷ = b̂x + â，b̂ 是斜率。【怎么用】回归方程用于「预测」，但相关不代表因果。',
                quiz: [
                  {
                    stem: '线性回归求的是什么？',
                    options: ['回归直线', '曲线', '散点', '平均数'],
                    answerIndex: 0,
                  },
                  {
                    stem: '最小二乘法的目标是？',
                    options: ['距离平方和最小', '距离和最小', '距离最大', '点数最多'],
                    answerIndex: 0,
                  },
                  {
                    stem: '回归方程的作用是？',
                    options: ['预测', '证明因果', '求面积', '求体积'],
                    answerIndex: 0,
                  },
                ],
              },
              {
                word: '独立性检验',
                meaning: '用 χ² 统计量判断两个分类变量是否相关',
                order: 3,
                partOfSpeech: '概率与统计',
                example: '吸烟与肺癌是否相关',
                explanation:
                  '【是什么】两个「分类变量」（如吸烟、患病）是否有关？【为什么】独立性检验：算 χ² 值，与临界值比较判断是否相关。【结论】χ² 越大，越有把握说两变量相关（不独立）。【怎么用】先列联表，再算 χ²，再与临界值比。',
                quiz: [
                  {
                    stem: '独立性检验用哪个统计量？',
                    options: ['χ²', 't', 'z', 'F'],
                    answerIndex: 0,
                  },
                  {
                    stem: 'χ² 越大，说明？',
                    options: ['两变量越可能相关', '越无关', '没有关系', '无法判断'],
                    answerIndex: 0,
                  },
                  {
                    stem: '独立性检验判断的是？',
                    options: ['两个分类变量是否独立', '连续变量的均值', '方差', '中位数'],
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
