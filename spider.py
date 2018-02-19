#!pyana
# -*- coding: utf-8 -*-

import json, math, queue
from time import sleep
from threading import Thread

import requests

import pandas as pd
#import numpy as np
#import matplotlib.pyplot as plt

# *******************************************************
# 扫描参数
# *******************************************************
#MAX_USER_ID = 259899999
MAX_USER_ID = 4

# *******************************************************
# 封装 HTTP 请求
# *******************************************************
tasks = queue.Queue()
is_closing = False

# *******************************************************
# 后台进程
# *******************************************************
def deamon():

	print('<daemon> 运行中 ...')

	while True:

		sleep(0.1)

		print('<daemon> 循环中 ...')

		try:
			name, url, hdlr, cb = tasks.get()

			print('<daemon> 处理消息', name)

		except queue.Empty:
			continue

		else:
			req = None
			txt = None
			res = None

			try:
				req = requests.get(url)

			except requests.exceptions.Timeout:
				tasks.put_nowait(url)
				print('<daemon> 请求超时 !')
				continue

			try:
				txt = hdlr(req.text)

			except:
				# TODO logging
				print('<daemon> 失败！未能成功处理消息文本！')
				continue

			try:
				res = json.loads(txt)

			except:
				# TODO logging
				print('<daemon> 失败！未能成功解析 JSON！')
				continue

			try:
				code = res['code']

			except KeyError:

				try:
					status = res['status']

				except KeyError:
					cb(None)
					# TODO logging
					print('<daemon> 找不到 `code` 或 `status`！')

				else:

					if status is True:
						cb(res)

					else:
						cb(None)
						# TODO logging
						print('<daemon> 非法 `status` [{}] !'.format(status))

			else:

				if code == 0:
					cb(res)

				else:
					#message = res['message']
					#ttl = res['ttl']
					cb(None)
					# TODO logging
					print('<daemon> 非法 `code` [{}] !'.format(code))

	print('<daemon> 循环结束！')

# *******************************************************
# 将 HTTP 请求压栈
# *******************************************************
def get(url, name = '', handler = (lambda text: text), callback = None):

	print('请求 [{}] 压栈'.format(name))

	if callback is None:
		raise TypeError('`callback` 空指针！')

	global tasks
	tasks.put_nowait({'name': name, 'url': url, 'hdlr': handler, 'cb': callback})

# *******************************************************
# 处理 __jp5 回调
# *******************************************************
def handle_jp5(text):
	if len(text) <= 7:
		raise AssertionError('handle_jp5 内容具有错误长度 [{}]！'.format(len(text)))

	prefix, suffix = text[:6], text[-1]
	if prefix == '__jp5(' and suffix == ')':
		return text[6:-1]

# *******************************************************
# 处理用户关注关系数据
# *******************************************************
def handle_relation_data(data):
	buf = []

	for user in data['list']:
		entry = {
			'mid': user['mid'],
			#'attribute': user['attribute'],
			'mtime': user['mtime'],
			#'tag': user['tag'],
			#'special': user['special'],
			#'uname': user['uname'],
			#'face': user['face'],
			#'sign': user['sign'],
			#'official_verify': {
			#	'type': user['official_verify']['type'],
			#	'desc': user['official_verify']['desc'],
			#},
			#'vip': {
			#	'vipType': user['vip']['vipType'],
			#	'vipDueDate': user['vip']['vipDueDate'],
			#	'dueRemark': user['vip']['dueRemark'],
			#	'accessStatus': user['vip']['accessStatus'],
			#	'vipStatus': user['vip']['vipStatus'],
			#	'vipStatusWarn': user['vip']['vipStatusWarn'],
			#},
		}
		buf.append(entry)

	return buf

# *******************************************************
# 获取该用户粉丝列表
# *******************************************************
def get_followers(user_id, count_followers):
	step = 50
	followers = []

	for page in range(1, min(5, 1 + math.ceil(count_followers / step))):
		url = 'https://api.bilibili.com/x/relation/followers?vmid={}&pn={}&ps={}&order=desc&jsonp=jsonp&callback=__jp5'.format(user_id, page, step)
		get(url, name='get_followers', handler=handle_jp5, callback=lambda res: followers.extend(handle_relation_data(res['data'])))

	return followers

# *******************************************************
# 获取该用户关注列表
# *******************************************************
def get_followings(user_id, count_followings):
	step = 50
	followings = []

	for page in range(1, min(5, 1 + math.ceil(count_followings / step))):
		url = 'https://api.bilibili.com/x/relation/followings?vmid={}&pn={}&ps={}&order=desc&jsonp=jsonp&callback=__jp5'.format(user_id, page, step)
		get(url, name='get_followings', handler=handle_jp5, callback=lambda res: followings.extend(handle_relation_data(res['data'])))

	return followings

# *******************************************************
# 获取该用户基础信息
# *******************************************************
def get_user_info(user_id):
	#url01 = 'https://api.bilibili.com/x/relation/stat?vmid={}'.format(user_id)
	url02 = 'https://api.bilibili.com/x/space/navnum?mid={}'.format(user_id)
	step = 50
	following = None
	follower = None
	list_followings = None
	list_followers = None
	video = None
	videos = []

	print('正在扫描用户 [{}] ...'.format(user_id))

	def handle_relation(res01):
		nonlocal following
		nonlocal follower
		nonlocal list_followings
		nonlocal list_followers

		data = res01['data']
		# 该用户关注的人 - 数量
		following = int(data['following'])
		# 该用户的悄悄话 - 数量
		#whisper = int(data['whisper'])
		# 该用户的黑名单 - 数量
		#black = int(data['black'])
		# 关注该用户的人 - 数量
		follower = int(data['follower'])

		# 该用户的关注列表
		list_followings = get_followings(user_id, following)
		# 该用户的粉丝列表
		list_followers = get_followers(user_id, follower)

	def handle_information(res02):
		nonlocal video

		data = res02['data']
		# 该用户上传的视频 - 数量
		video = int(data['video'])
		print('视频数量：', video)
		# 该用户订阅的番剧 - 数量
		#bangumi = int(data['bangumi'])
		# 该用户创建的频道 - 数量
		#channel = {'master': int(data['channel']['master']), 'guest': int(data['channel']['guest'])}
		# 该用户创建的收藏夹 - 数量
		#favourite = {'master': int(data['favourite']['master']), 'guest': int(data['favourite']['guest'])}
		# 该用户订阅的标签 - 数量
		#tag = int(data['tag'])
		# 该用户撰写的文章 - 数量
		#article = int(data['article'])
		#playlist = data['playlist']
		#album = data['album']

	def handle_video_list(res):
		nonlocal videos

		data = res['data']
		vlist = data['vlist']

		for video_info in vlist:
			videos.append({
				# 评论数量
				'comment': int(video_info['comment']),
				# 视频分类
				'typeid': video_info['typeid'],
				# 播放量
				'play': int(video_info['play']),
				# 视频封面图片
				'pic': video_info['pic'],
				# 子标题？
				#'subtitle': video_info['subtitle'],
				# 视频简介
				#'description': video_info['description'],
				# 版权
				#'copyright': video_info['copyright'],
				# 视频标题
				'title': video_info['title'],
				#'review': video_info['review'],
				# 作者昵称
				#'author': video_info['author'],
				# 作者ID
				'mid': int(video_info['mid']),
				# 发布时间
				'created': int(video_info['created']),
				# 时间长度
				'length': video_info['length'],
				#'video_review': video_info['video_review'],
				# 视频av号
				'aid': int(video_info['aid']),
				#'hide_click': video_info['hide_click'],
			})

	#####################################################
	# 关系网
	#####################################################
	#get(url01, name='get_user_info', callback=handle_relation)

	#####################################################
	# 稿件信息
	#####################################################
	get(url02, name='get_user_info', callback=handle_information)
	print('视频数量：', video)

	#####################################################
	# 遍历视频
	#
	# 参考：https://space.bilibili.com/ajax/member/getSubmitVideos?mid=6290510&pagesize=50&page=1
	#####################################################
	for page in range(1, min(5, 1 + math.ceil(video / step))):
		url = 'http://space.bilibili.com/ajax/member/getSubmitVideos?mid={}&pagesize={}&page={}'.format(user_id, step, page)
		get(url, name='get_user_info', callback=handle_video_list)

	#####################################################
	# 存储数据
	#####################################################
	info = {
		#'followings': {
		#	'count': following,
		#	'users': list_followings,
		#},
		#'followers': {
		#	'count': follower,
		#	'users': list_followers,
		#},
		'videos': {
			'count': video,
			'videos': videos,
		},
	}

	return info

'''
def get_video_info(video_id):
	url = 'https://api.bilibili.com/x/web-interface/archive/stat?aid={}'.format(video_id)
	res = get(url, name='get_video_info', callback=None)

def get_comments(video_id):
	url = 'https://api.bilibili.cn/feedback?aid={}'.format(video_id)
	res = get(url, name="get_comments", callback=None)
'''

def main():
	# 遍历用户 ID
	for user_id in range(2, MAX_USER_ID):
		info = get_user_info(user_id)

		pd.DataFrame([[video['comment'], video['typeid'], video['play'], video['title'], video['created'], video['length'], video['aid'], video['mid']] for video in info['videos']['videos']],
			columns=['comment', 'typeid', 'play', 'title', 'created', 'length', 'aid', 'mid']).to_csv('datasets/info/video_info.csv')

class DaemonThread(Thread):

	def __init__(self):
			Thread.__init__(self)
			self.daemon = True
			self.name = 'Bilibili 爬虫 后台线程'

	def run(self):
		print('线程 `{}` 正在运行 ...'.format(self.name))
		deamon()

class MainThread(Thread):

	def __init__(self):
			Thread.__init__(self)
			self.name = 'Bilibili 爬虫 主线程'

	def run(self):
		print('线程 `{}` 正在运行 ...'.format(self.name))
		main()

DaemonThread().start()
MainThread().start()
