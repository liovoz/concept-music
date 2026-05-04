// ====================
// 文件：src/utils/songHelper.js
// ====================

export const findDeepDuration = (obj, depth = 0) => {
  if (depth > 3 || !obj || typeof obj !== 'object') return 0;
  const keysToMatch = ['duration', 'timelength', 'time_length', 'timelen'];
  for (let key of Object.keys(obj)) {
    const lowerKey = key.toLowerCase();
    if (keysToMatch.some(k => lowerKey.includes(k))) {
      const val = parseInt(obj[key], 10);
      if (!isNaN(val) && val > 0) return val;
    }
  }
  for (let val of Object.values(obj)) {
    const res = findDeepDuration(val, depth + 1);
    if (res > 0) return res;
  }
  return 0;
};

export const normalizeSongs = (rawList, defaultImg = 'https://images.unsplash.com/photo-1614680376593-902f74cf0d41?w=300&q=80') => {
  return rawList.filter(item => {
    if (!item || typeof item !== 'object') return false;
    const hash = item.FileHash || item.hash || item.filehash || item.audio_info?.hash_128 || item['320hash'] || item.HQFileHash || item.hqhash || item.sqhash || item.SQFileHash || item.audio_info?.hash_flac || item.audio_info?.hash_high || '';
    const mixId = item.album_audio_id || item.mixsongid || item.audio_id || '';
    const name = item.SongName || item.songname || item.name || item.FileName || item.filename || item.title || item.Title || '';
    
    return !!(name && (hash || mixId));
  }).map(song => {
    let hash128 = song.FileHash || song.hash || song.filehash || song.audio_info?.hash_128 || '';
    let hash320 = song['320hash'] || song.HQFileHash || song.hqhash || song.audio_info?.hash_320 || '';
    let hashFlac = song.sqhash || song.SQFileHash || song.audio_info?.hash_flac || song.audio_info?.hash_high || '';
    let hashViperClear = '';
    let hashViperAtmos = '';
    let hashHigh = '';

    if (song.relate_goods && Array.isArray(song.relate_goods)) {
        song.relate_goods.forEach(item => {
            if (!item.hash) return;
            const br = parseInt(item.bitrate || 0, 10);
            const lvl = parseInt(item.level || 0, 10);
            if (!hash128 && (br === 128 || lvl === 2)) hash128 = item.hash;
            if (!hash320 && (br === 320 || lvl === 4)) hash320 = item.hash;
            if (!hashFlac && (br > 320 || lvl === 5 || lvl === 6 || lvl === 7)) hashFlac = item.hash;
            if (lvl === 6) hashHigh = item.hash;
            if (lvl === 7) hashViperClear = item.hash;
            if (lvl === 8) hashViperAtmos = item.hash;
        });
    }

    const qualities = {
        standard: hash128, hq: hash320, sq: hashFlac,
        high: hashHigh || hashFlac, viper_clear: hashViperClear || hashFlac, viper_atmos: hashViperAtmos || hashFlac
    };

    let rawTitle = song.SongName || song.songname || song.name || song.FileName || song.filename || song.title || song.Title || '未知标题';
    let rawSinger = song.SingerName || song.singername || song.author_name || song.author || '';

    let singerId = song.SingerId || song.singerid || song.author_id || song.singer_id || '';
    if (!singerId && song.Singers && Array.isArray(song.Singers) && song.Singers.length > 0) {
        const s = song.Singers[0];
        singerId = s.id || s.singer_id || s.singerid || s.ID || '';
    }
    if (!singerId && song.singerinfo && Array.isArray(song.singerinfo) && song.singerinfo.length > 0) {
        singerId = song.singerinfo[0].id || song.singerinfo[0].singer_id || song.singerinfo[0].singerid || '';
    }
    if (!singerId && song.authors && Array.isArray(song.authors) && song.authors.length > 0) {
        singerId = song.authors[0].author_id || song.authors[0].id || '';
    }
    if (!singerId && song.singer_list && Array.isArray(song.singer_list) && song.singer_list.length > 0) {
        singerId = song.singer_list[0].id || song.singer_list[0].singer_id || song.singer_list[0].singerid || '';
    }

    singerId = String(singerId || '').trim();
    const hasValidSingerId = singerId && singerId !== '' && singerId !== '0' && singerId !== 'undefined' && singerId !== 'null';

    const extractSingersArray = (songObj) => {
        const singers = [];

        if (songObj.Singers && Array.isArray(songObj.Singers)) {
            songObj.Singers.forEach(s => {
                const sid = s.id || s.singer_id || s.singerid || s.ID || '';
                const sname = s.name || s.singer_name || s.singername || '';
                if (sname) {
                    singers.push({ id: String(sid || '').trim(), name: sname.trim() });
                }
            });
        }

        if (songObj.singerinfo && Array.isArray(songObj.singerinfo)) {
            songObj.singerinfo.forEach(s => {
                const sid = s.id || s.singer_id || s.singerid || '';
                const sname = s.name || s.singer_name || s.singername || '';
                if (sname) {
                    singers.push({ id: String(sid || '').trim(), name: sname.trim() });
                }
            });
        }

        if (singers.length === 0 && songObj.authors && Array.isArray(songObj.authors)) {
            songObj.authors.forEach(a => {
                const aid = a.author_id || a.id || a.singer_id || '';
                const aname = a.author_name || a.name || a.singer_name || a.singername || '';
                if (aname) {
                    singers.push({ id: String(aid || '').trim(), name: aname.trim() });
                }
            });
        }

        if (singers.length === 0 && songObj.singer_list && Array.isArray(songObj.singer_list)) {
            songObj.singer_list.forEach(s => {
                const sid = s.id || s.singer_id || s.singerid || '';
                const sname = s.name || s.singer_name || s.singername || '';
                if (sname) {
                    singers.push({ id: String(sid || '').trim(), name: sname.trim() });
                }
            });
        }

        if (singers.length === 0 && rawSinger && rawSinger !== '未知歌手') {
            const names = rawSinger.split(/[,，、\/]/).map(n => n.trim()).filter(n => n);
            names.forEach((name, idx) => {
                const sid = idx === 0 && hasValidSingerId ? singerId : '';
                singers.push({ id: sid, name });
            });
        }

        return singers;
    };

    const singersArray = extractSingersArray(song);

    if (rawTitle.includes(' - ')) {
      const parts = rawTitle.split(' - ');
      if (!rawSinger || rawSinger === '未知歌手') rawSinger = parts[0].trim();
      rawTitle = parts.slice(1).join(' - ').trim();
    }
    if (!rawSinger) rawSinger = '未知歌手';

    // ✨ 核心修复 2：智能推断“单曲”和“现场录音”，消除廉价的“未知专辑”
    let album = (song.AlbumName || song.album_name || song.album_info?.album_name || song.remark || '').trim();
    if (!album || album === '未知专辑') {
        const lowerTitle = rawTitle.toLowerCase();
        // 如果歌曲标题带现场演出的标志，自动归类为现场录音
        if (lowerTitle.includes('live') || lowerTitle.includes('演唱会') || lowerTitle.includes('音乐会') || lowerTitle.includes('巡回') || lowerTitle.includes('tour')) {
            album = '现场录音';
        } else {
            album = '单曲';
        }
    }

    const albumId = String(song.AlbumID || song.album_id || song.albumid || song.album_info?.album_id || '');
    const albumAudioId = String(song.MixSongID || song.mixsongid || song.album_audio_id || song.audio_id || '');

    let durationSec = findDeepDuration(song);
    if (durationSec > 10000) durationSec = Math.floor(durationSec / 1000);
    const mins = Math.floor(durationSec / 60).toString().padStart(2, '0');
    const secs = Math.floor(durationSec % 60).toString().padStart(2, '0');
    const durationFormatted = durationSec > 0 ? `${mins}:${secs}` : '--:--';

    let isVip = false;
    let isPaid = false;
    const privObj = song.privilege_download || {};
    const privilege = song.Privilege ?? song.privilege ?? privObj.privilege ?? 0;
    const payType = song.PayType ?? song.pay_type ?? 0;

    if (payType === 1 || payType === 2) isPaid = true;
    if (privilege === 10 || privilege === 8) isVip = true;
    if (!isVip && payType === 3) isVip = true;
    if (!isVip && song.pay_block_tpl === 1) isVip = true;
    if (!isVip && song.download && Array.isArray(song.download) && song.download.length > 0) {
      if (song.download[0].pay_type === 3 || song.download[0].PayType === 3) isVip = true;
    }

    let rawCover = song.cover || song.Image || song.image || song.Pic || song.pic || song.trans_param?.union_cover || song.albuminfo?.cover || song.album_cover;
    let songCover = defaultImg;
    if (rawCover && typeof rawCover === 'string') {
      songCover = rawCover.replace(/\{size\}/g, '400');
    }

    return {
      ...song,
      _hash: hash128,
      _title: rawTitle,
      _singer: rawSinger,
      _singer_id: singerId,
      _singers: singersArray,
      _album: album,
      _duration: durationFormatted,
      _album_id: albumId,
      _album_audio_id: albumAudioId,
      _is_vip: isVip,
      _is_paid: isPaid,
      _cover: songCover,
      _qualities: qualities
    };
  });
};

export const buildPlayPayload = (song, fallbackCover = 'https://images.unsplash.com/photo-1614680376593-902f74cf0d41?w=300&q=80') => {
  return {
    hash: song._hash,
    name: song._title,
    singer: song._singer,
    singer_id: song._singer_id,
    _singers: song._singers || (song._singer ? [{ id: song._singer_id || '', name: song._singer }] : []),
    album: song._album,
    cover: song._cover || fallbackCover,
    album_id: song._album_id,
    album_audio_id: song._album_audio_id,
    is_vip: song._is_vip,
    is_paid: song._is_paid,
    qualities: song._qualities
  };
};