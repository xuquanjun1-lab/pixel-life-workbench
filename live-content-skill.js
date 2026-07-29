(() => {
  const vocabulary = [
    ['achieve', '实现；达成', '成长'],
    ['adapt', '适应；调整', '成长'],
    ['balance', '平衡', '生活'],
    ['clarity', '清晰；明确', '思考'],
    ['consistent', '持续稳定的', '习惯'],
    ['curious', '好奇的', '学习'],
    ['delight', '愉快；欣喜', '情绪'],
    ['efficient', '高效的', '工作'],
    ['encourage', '鼓励', '沟通'],
    ['essential', '必要的；核心的', '工作'],
    ['explore', '探索', '学习'],
    ['flexible', '灵活的', '工作'],
    ['focus', '专注', '习惯'],
    ['gentle', '温和的', '情绪'],
    ['improve', '改善；提升', '成长'],
    ['inspire', '启发', '创意'],
    ['meaningful', '有意义的', '生活'],
    ['momentum', '动力；势头', '成长'],
    ['observe', '观察', '思考'],
    ['patient', '有耐心的', '情绪'],
    ['practice', '练习', '学习'],
    ['progress', '进步；进展', '成长'],
    ['reflect', '反思；复盘', '思考'],
    ['resilient', '有韧性的', '成长'],
    ['routine', '日常习惯', '生活'],
    ['serendipity', '意外发现美好事物的运气', '生活'],
    ['steady', '稳定的', '习惯'],
    ['thoughtful', '深思熟虑的', '沟通'],
    ['thrive', '茁壮成长', '成长'],
    ['worthwhile', '值得投入的', '工作']
  ];

  const phrases = [
    ['Take it one step at a time.', '一步一步来。', '用它安慰正在赶进度的自己。'],
    ['Small progress is still progress.', '小小的进步也是进步。', '说出今天完成的一件小事。'],
    ['I am making room for what matters.', '我正在为重要的事留出空间。', '描述你今天主动放弃的一件事。'],
    ['Done is better than perfect.', '完成比完美更重要。', '用它结束一次过度纠结。'],
    ['Let me think it through.', '让我认真想一想。', '在需要争取思考时间时使用。'],
    ['Could you say that again, please?', '可以请你再说一遍吗？', '练习礼貌地请求重复。'],
    ['I would like to learn more about it.', '我想进一步了解它。', '用在课程、会议或聊天中。'],
    ['That sounds like a good plan.', '听起来是个好计划。', '练习表达支持与确认。']
  ];

  const courses = [
    {
      title: 'BBC Learning English',
      level: '全等级 · 综合课程',
      description: '短视频、新闻英语、发音、听说读写练习。',
      url: 'https://feeds.bbci.co.uk/learningenglish'
    },
    {
      title: 'BBC Pronunciation Workshop',
      level: 'A2–C1 · 发音',
      description: '跟读自然语流、连读、元音和辅音。',
      url: 'https://feeds.bbci.co.uk/learningenglish/english/features/pronunciation/'
    },
    {
      title: 'VOA Learning English Podcast',
      level: '初中级 · 听力',
      description: '较慢语速的新闻、生活和文化英语节目。',
      url: 'https://learningenglish.voanews.com/podcasts'
    },
    {
      title: 'VOA Let’s Learn English',
      level: '入门 · 系统课程',
      description: '从基础场景逐步训练听、说、读、写。',
      url: 'https://learningenglish.voanews.com/p/5644.html'
    }
  ];

  const dayKey = () => new Date().toISOString().slice(0, 10);
  const hash = value => [...value].reduce((total, character) => ((total << 5) - total + character.charCodeAt(0)) | 0, 0);
  const withTimeout = async (url, timeout = 9000) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } finally {
      clearTimeout(timer);
    }
  };

  const domainName = value => {
    try {
      return new URL(value).hostname.replace(/^www\./, '');
    } catch {
      return 'news.ycombinator.com';
    }
  };

  const fetchAiNews = async () => {
    const queries = ['artificial intelligence', 'OpenAI', 'Anthropic AI', 'Google Gemini'];
    const requests = queries.map(query => {
      const endpoint = new URL('https://hn.algolia.com/api/v1/search_by_date');
      endpoint.searchParams.set('query', query);
      endpoint.searchParams.set('tags', 'story');
      endpoint.searchParams.set('hitsPerPage', '8');
      return withTimeout(endpoint.toString());
    });
    const responses = await Promise.allSettled(requests);
    const seen = new Set();
    const stories = responses.flatMap(result => result.status === 'fulfilled' ? result.value.hits || [] : [])
      .filter(item => item.title && (item.url || item.objectID))
      .sort((left, right) => new Date(right.created_at) - new Date(left.created_at))
      .filter(item => {
        const key = item.url || item.title;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 10)
      .map(item => {
        const url = item.url || `https://news.ycombinator.com/item?id=${item.objectID}`;
        return {
          id: `live-news-${item.objectID}`,
          title: item.title,
          meta: `${new Date(item.created_at).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })} · ${item.points || 0} 赞 · ${item.num_comments || 0} 讨论`,
          summary: `Hacker News 实时收录，来源 ${domainName(url)}。点击查看原文与社区讨论。`,
          url,
          source: domainName(url),
          live: true
        };
      });
    if (!stories.length) throw new Error('No live news');
    return stories;
  };

  const normalizeWord = (payload, fallback) => {
    const entry = Array.isArray(payload) ? payload[0] : null;
    const meaning = entry?.meanings?.find(item => item.definitions?.length) || entry?.meanings?.[0];
    const definition = meaning?.definitions?.[0];
    const audio = entry?.phonetics?.find(item => item.audio)?.audio || '';
    return {
      id: `word-${fallback[0]}`,
      word: entry?.word || fallback[0],
      title: `${entry?.word || fallback[0]} · ${fallback[1]}`,
      translation: fallback[1],
      category: fallback[2],
      phonetic: entry?.phonetic || entry?.phonetics?.find(item => item.text)?.text || '',
      definition: definition?.definition || 'Practice this word in a sentence today.',
      example: definition?.example || `I want to use the word “${fallback[0]}” in a meaningful sentence.`,
      audio: audio.startsWith('//') ? `https:${audio}` : audio,
      done: false,
      live: true
    };
  };

  const lookupEnglishWord = async word => {
    const normalized = word.trim().toLowerCase().replace(/[^a-z'-]/g, '');
    if (!normalized) throw new Error('Invalid word');
    const known = vocabulary.find(item => item[0] === normalized) || [normalized, '在线查询词义', '自选'];
    const payload = await withTimeout(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(normalized)}`);
    return normalizeWord(payload, known);
  };

  const fetchEnglishWords = async (offset = 0) => {
    const seed = Math.abs(hash(`${dayKey()}-${offset}`));
    const selected = Array.from({ length: 4 }, (_, index) => vocabulary[(seed + index * 7) % vocabulary.length]);
    const results = await Promise.allSettled(selected.map(async item => normalizeWord(await withTimeout(`https://api.dictionaryapi.dev/api/v2/entries/en/${item[0]}`), item)));
    return results.map((result, index) => result.status === 'fulfilled' ? result.value : normalizeWord(null, selected[index]));
  };

  const getDailyPhrase = () => {
    const index = Math.abs(hash(dayKey())) % phrases.length;
    const [text, translation, challenge] = phrases[index];
    return { id: `phrase-${dayKey()}`, text, translation, challenge };
  };

  window.DailyTownLiveSkill = {
    courses,
    dayKey,
    fetchAiNews,
    fetchEnglishWords,
    getDailyPhrase,
    lookupEnglishWord
  };
})();
