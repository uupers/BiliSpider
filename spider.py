#!/usr/bin/python
# -*- coding: utf-8 -*-

import json, re, math, time
from collections import deque
from time import sleep
from threading import RLock, Thread, Condition

import requests

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt

# *******************************************************
# 封装 HTTP 请求
# *******************************************************
tasks = deque()
tasks_rlock = RLock()
tasks_condition_is_empty = Condition(tasks_rlock)
is_closing = False

# *******************************************************
# 后台进程
# *******************************************************
def deamon():

	while not is_closing:
		
		try:
			with tasks_rlock:
				while not tasks_condition_is_empty():
					tasks_rlock.wait()

				url, hdlr, cb = tasks.pop()

		except IndexError:
			continue

		else:
			req = None

			try:
				req = requests.get(url)

			except requests.exceptions.Timeout:
				tasks.appendleft(url)
				continue

			text = hdlr(req.text)
			res = json.loads(text)

			try:
				code = res['code']

			except KeyError:

				try:
					status = res['status']

				except KeyError:
					cb(None)
					# TODO logging

				else:

					if status is True:
						cb(res)

					else:
						cb(None)
						# TODO logging

			else:

				if code == 0:
					cb(res)

				else:
					message = res['message']
					ttl = res['ttl']
					cb(None)
					# TODO logging

# *******************************************************
# 将 HTTP 请求压栈
# *******************************************************
def get(*urls, **kwargs):

	callback = kwargs['callback']
	handler = kwargs['handler'] or (lambda text: text)

	if callback is None:
		raise TypeError('callback is None!')

	if urls and len(urls) > 0:
		# 遍历压栈
		for url in urls:
			global tasks
			tasks.appendleft({'url': url, 'hdlr': handler, 'cb': callback})

		# 后台线程进入就绪态
		with tasks_rlock:
			tasks_rlock.notify()

# *******************************************************
# 处理 __jp5 回调
# *******************************************************
def handle_jp5(text):
	if len(text) <= 7:
		raise AssertionError('handle_jp5 - length error')

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
		res = get(url, handler=handle_jp5, callback=lambda res: followers.extend(handle_relation_data(res['data'])))

	return followers

# *******************************************************
# 获取该用户关注列表
# *******************************************************
def get_followings(user_id, count_followings):
	step = 50
	followings = []

	for page in range(1, min(5, 1 + math.ceil(count_followings / step))):
		url = 'https://api.bilibili.com/x/relation/followings?vmid={}&pn={}&ps={}&order=desc&jsonp=jsonp&callback=__jp5'.format(user_id, page, step)
		res = get(url, handler=handle_jp5, callback=lambda res: followings.extend(handle_relation_data(res['data'])))

	return followings

# *******************************************************
# 获取该用户基础信息
# *******************************************************
def get_user_info(user_id):
	url01 = 'https://api.bilibili.com/x/relation/stat?vmid={}'.format(user_id)
	url02 = 'https://api.bilibili.com/x/space/navnum?mid={}'.format(m_id)
	step = 50
	following = None
	follower = None
	list_followings = None
	list_followers = None
	video = None
	videos = []

	def handle_relation(res01):
		nonlocal following
		nonlocal follower
		nonlocal list_followings
		nonlocal list_followers

		data = res01['data']
		# 该用户关注的人 - 数量
		following = data['following']
		# 该用户的悄悄话 - 数量
		#whisper = data['whisper']
		# 该用户的黑名单 - 数量
		#black = data['black']
		# 关注该用户的人 - 数量
		follower = data['follower']

		# 该用户的关注列表
		list_followings = get_followings(user_id, following)
		# 该用户的粉丝列表
		list_followers = get_followers(user_id, follower)

	def handle_information(res02):
		nonlocal video

		data = res02['data']
		# 该用户上传的视频 - 数量
		video = data['video']
		# 该用户订阅的番剧 - 数量
		#bangumi = data['bangumi']
		# 该用户创建的频道 - 数量
		#channel = {'master': data['channel']['master'], 'guest': data['channel']['guest']}
		# 该用户创建的收藏夹 - 数量
		#favourite = {'master': data['favourite']['master'], 'guest': data['favourite']['guest']}
		# 该用户订阅的标签 - 数量
		#tag = data['tag']
		# 该用户撰写的文章 - 数量
		#article = data['article']
		#playlist = data['playlist']
		#album = data['album']

	def handle_video_list(res):
		nonlocal videos

		data = res['data']
		vlist = data['vlist']

		for video_info in vlist:
			videos.append({
				# 评论数量
				'comment': video_info['comment'],
				# 视频分类
				'typeid': video_info['typeid'],
				# 播放量
				'play': video_info['play'],
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
				'mid': video_info['mid'],
				# 发布时间
				'created': video_info['created'],
				# 时间长度
				'length': video_info['length'],
				#'video_review': video_info['video_review'],
				# 视频av号
				'aid': video_info['aid'],
				#'hide_click': video_info['hide_click'],
			})

	#####################################################
	# 关系网
	#####################################################
	#get(url01, callback=handle_relation)

	#####################################################
	# 稿件信息
	#####################################################
	get(url02, callback=handle_information)

	#####################################################
	# 遍历视频
	#
	# 参考：https://space.bilibili.com/ajax/member/getSubmitVideos?mid=6290510&pagesize=50&page=1
	#####################################################
	for page in range(1, min(5, 1 + math.ceil(video / step))):
		url = 'http://space.bilibili.com/ajax/member/getSubmitVideos?mid={}&pagesize={}&page={}'.format(user_id, step, page)
		get(url, callback=handle_video_list)

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
	res = get(url)

def get_comments(video_id):
	url = 'http://api.bilibili.cn/feedback?aid={}'.format(video_id)
	res = get(url)
'''

def main():
	# 遍历用户 ID
	MAX_USER_ID = 259899999
	for user_id in range(2, MAX_USER_ID):
		info = get_user_info(user_id)

		pd.DataFrame([[video['comment'], video['typeid'], video['play'], video['title'], video['created'], video['length'], video['aid'], video['mid']] for video in info['videos']['videos']],
			columns=['comment', 'typeid', 'play', 'title', 'created', 'length', 'aid', 'mid']).to_csv('datasets/info/video_info.csv')

		sleep(1)

class DaemonThread(Thread):

	def run(self):
		deamon()

class MainThread(Thread):

	def run(self):
		main()

DaemonThread().start()
MainThread().start()