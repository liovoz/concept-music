const { decodeLyrics } = require('../util');

const extractTranslation = (languageField) => {
  if (!languageField || typeof languageField !== 'string') return null;
  try {
    const langStr = Buffer.from(languageField, 'base64').toString('utf8');
    const langData = JSON.parse(langStr);
    if (!langData?.content || !Array.isArray(langData.content)) return null;
    const transContent = langData.content.find(c => c.type === 1);
    if (!transContent?.lyricContent) return null;
    return transContent.lyricContent.map(arr => {
      if (Array.isArray(arr)) return arr.filter(s => typeof s === 'string').join('');
      return typeof arr === 'string' ? arr : '';
    });
  } catch (e) {
    return null;
  }
};

const extractTranslationFromText = (text) => {
  if (!text) return null;
  const langMatch = text.match(/\[language:(.*?)\]/);
  if (langMatch && langMatch[1]) {
    return extractTranslation(langMatch[1]);
  }
  return null;
};

module.exports = (params, useAxios) => {
  const dataMap = {
    ver: 1,
    client: params?.client || 'android',
    id: params?.id,
    accesskey: params?.accesskey,
    fmt: params.fmt || 'krc',
    charset: 'utf8',
  };

  return new Promise((resolve, reject) => {
    useAxios({
      baseURL: 'https://lyrics.kugou.com',
      url: '/download',
      method: 'GET',
      params: dataMap,
      cookie: params?.cookie || {},
      encryptType: 'android',
    })
      .then((res) => {
        if (params?.decode) {
          if (res.body?.content) {
            const isLrc = params?.fmt == 'lrc' || Number(res.body?.contenttype) !== 0;
            res.body['decodeContent'] = isLrc
              ? Buffer.from(res.body?.content, 'base64').toString()
              : decodeLyrics(res.body.content);

            let translation = extractTranslation(res.body.language);

            if (!translation) {
              translation = extractTranslationFromText(res.body.decodeContent);
            }

            if (!translation && !isLrc) {
              const lrcParams = { ...dataMap, fmt: 'lrc' };
              useAxios({
                baseURL: 'https://lyrics.kugou.com',
                url: '/download',
                method: 'GET',
                params: lrcParams,
                cookie: params?.cookie || {},
                encryptType: 'android',
              }).then(lrcRes => {
                if (lrcRes.body?.content) {
                  const lrcText = Buffer.from(lrcRes.body.content, 'base64').toString('utf8');
                  translation = extractTranslation(lrcRes.body.language);
                  if (!translation) {
                    translation = extractTranslationFromText(lrcText);
                  }
                }
                if (translation && translation.length > 0) {
                  res.body['translation'] = translation;
                }
                resolve(res);
              }).catch(() => {
                resolve(res);
              });
              return;
            }

            if (translation && translation.length > 0) {
              res.body['translation'] = translation;
            }

            resolve(res);
            return;
          }
        }
        resolve(res);
      })
      .catch((e) => reject(e));
  });
};
