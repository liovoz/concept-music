// 手机验证码发送
module.exports = (params, useAxios) => {
  const mobile = String(params?.mobile || params?.body?.mobile || '').trim();
  const dataMap = {
    businessid: 5,
    mobile,
    plat: 3,
  };

  const cookie = Object.assign({}, params?.cookie || {});
  if (params?.cookie?.KUGOU_API_MID) {
    cookie.mid = params.cookie.KUGOU_API_MID;
  }

  return useAxios({
    baseURL: 'https://login-user.kugou.com',
    url: '/v7/send_mobile_code',
    method: 'POST',
    data: dataMap,
    encryptType: 'android',
    cookie,
  });
};
