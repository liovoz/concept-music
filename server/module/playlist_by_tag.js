module.exports = (params, useAxios) => {
  const tagId = params?.tag_id ?? '';

  return useAxios({
    url: '/api/v3/tag/specialList',
    method: 'GET',
    baseURL: 'http://mobilecdnbj.kugou.com',
    notSignature: true,
    clearDefaultParams: true,
    params: {
      plat: 0,
      page: params?.page || 1,
      tagid: tagId,
      pagesize: params?.pagesize || 30,
      ugc: 1,
      sort: params?.sort || 5,
      apiver: 2,
      area_code: 1,
    },
    cookie: params?.cookie || {},
  });
};
