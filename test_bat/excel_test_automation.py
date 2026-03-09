#!/usr/bin/env python3

import os
import sys
import json
import time
import logging
import argparse
from pathlib import Path
from typing import List, Dict, Optional, Tuple
import requests
from requests.exceptions import RequestException

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('excel_test.log', encoding='utf-8')
    ]
)
logger = logging.getLogger(__name__)

class ExcelTestAutomation:
    """Excel处理自动化测试类"""
    
    def __init__(self, base_url: str = "http://localhost:8000",
                 username: str = None, password: str = None,
                 minio_endpoint: str = "http://localhost:9000",
                 use_minio_direct: bool = False):
        """
        初始化测试自动化工具
        
        Args:
            base_url: API基础URL
            username: 用户名
            password: 密码
            minio_endpoint: MinIO端点URL（默认: http://localhost:9000）
            use_minio_direct: 是否直接访问MinIO下载文件（默认: False）
        """
        self.base_url = base_url.rstrip('/')
        self.username = username
        self.password = password
        self.minio_endpoint = minio_endpoint.rstrip('/')
        self.use_minio_direct = use_minio_direct
        self.session = requests.Session()
        self.token = None
        self.user_info = None
        
        # 设置默认请求头
        self.session.headers.update({
            'User-Agent': 'ExcelTestAutomation/1.0',
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        })
    
    def login(self) -> bool:
        """
        用户登录获取token
        
        Returns:
            bool: 登录是否成功
        """
        if not self.username or not self.password:
            logger.error("用户名或密码未提供")
            return False
            
        login_url = f"{self.base_url}/auth/login"
        login_data = {
            "account": self.username,
            "password": self.password
        }
        
        try:
            logger.info(f"正在登录用户: {self.username}")
            response = self.session.post(login_url, json=login_data)
            
            if response.status_code == 200:
                result = response.json()
                if result.get('code') == 0:
                    # 从响应中获取用户信息
                    self.user_info = result.get('data', {})
                    logger.info(f"登录成功，用户ID: {self.user_info.get('id', '未知')}")
                    
                    # 从cookie中获取token
                    cookies = self.session.cookies.get_dict()
                    if 'access_token' in cookies:
                        self.token = cookies['access_token']
                        logger.info("Token已从cookie获取")
                        
                        # 设置Authorization头
                        self.session.headers.update({
                            'Authorization': f'Bearer {self.token}'
                        })
                    else:
                        # 如果没有cookie token，尝试从响应头获取
                        logger.warning("未在cookie中找到access_token")
                    
                    return True
                else:
                    logger.error(f"登录失败: {result.get('msg', '未知错误')}")
                    return False
            else:
                logger.error(f"登录请求失败，状态码: {response.status_code}")
                logger.error(f"响应内容: {response.text}")
                return False
                
        except RequestException as e:
            logger.error(f"登录请求异常: {str(e)}")
            return False
    
    def upload_excel_file(self, excel_path: Path) -> Optional[str]:
        """
        上传Excel文件获取file_id
        
        Args:
            excel_path: Excel文件路径
            
        Returns:
            str: 文件ID，失败返回None
        """
        if not excel_path.exists():
            logger.error(f"文件不存在: {excel_path}")
            return None
            
        upload_url = f"{self.base_url}/file/upload"
        
        try:
            logger.info(f"正在上传文件: {excel_path.name}")
            
            # 方法：完全复制直接测试的成功代码
            # 1. 创建新的session（而不是使用self.session）
            import requests
            temp_session = requests.Session()
            
            # 2. 复制cookies从self.session到temp_session
            temp_session.cookies.update(self.session.cookies)
            
            # 3. 上传文件
            with open(excel_path, 'rb') as f:
                files = {'files': (excel_path.name, f, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')}
                
                # 4. 使用简化的headers（与直接测试相同）
                headers = {
                    'Accept': '*/*',
                }
                
                response = temp_session.post(upload_url, files=files, headers=headers)
            
            # 调试信息
            logger.debug(f"请求URL: {upload_url}")
            logger.debug(f"响应状态码: {response.status_code}")
            logger.debug(f"响应内容: {response.text[:200] if response.text else '空'}")
            
            if response.status_code == 200:
                result = response.json()
                if result.get('code') == 0:
                    file_items = result.get('data', [])
                    if file_items:
                        file_id = file_items[0].get('id')
                        logger.info(f"文件上传成功，file_id: {file_id}")
                        return file_id
                    else:
                        logger.error("上传成功但未返回文件信息")
                        return None
                else:
                    logger.error(f"文件上传失败: {result.get('msg', '未知错误')}")
                    return None
            else:
                logger.error(f"文件上传请求失败，状态码: {response.status_code}")
                logger.error(f"响应内容: {response.text}")
                return None
                
        except RequestException as e:
            logger.error(f"文件上传请求异常: {str(e)}")
            return None
        except Exception as e:
            logger.error(f"文件上传异常: {str(e)}")
            return None
    
    def process_excel_with_prompt(self, file_id: str, prompt: str,
                                  thread_id: Optional[str] = None) -> Optional[Dict]:
        """
        使用提示词处理Excel文件
        
        Args:
            file_id: 文件ID
            prompt: 处理提示词
            thread_id: 线程ID（可选）
            
        Returns:
            Dict: 处理结果，失败返回None
        """
        chat_url = f"{self.base_url}/chat"
        
        request_data = {
            "query": prompt,
            "file_ids": [file_id]
        }
        
        if thread_id:
            request_data["thread_id"] = thread_id
        
        try:
            logger.info(f"正在处理提示词: {prompt[:50]}...")
            
            # 设置较长的超时时间，因为处理可能需要一些时间
            response = self.session.post(chat_url, json=request_data, timeout=300)
            
            if response.status_code == 200:
                # 处理SSE流式响应
                result = self._parse_sse_response(response)
                
                # 检查处理是否成功
                if self._check_processing_success(result.get('events', [])):
                    logger.info(f"提示词处理成功: {prompt[:30]}...")
                else:
                    logger.warning(f"提示词处理可能失败: {prompt[:30]}...")
                
                return result
            else:
                logger.error(f"处理请求失败，状态码: {response.status_code}")
                logger.error(f"响应内容: {response.text[:500]}")
                return None
                
        except RequestException as e:
            logger.error(f"处理请求异常: {str(e)}")
            return None
    
    def _check_processing_success(self, events: List[Dict]) -> bool:
        """
        检查处理是否成功
        
        Args:
            events: SSE事件列表
            
        Returns:
            bool: 处理是否成功
        """
        # 查找complete事件
        for event in events:
            if event.get('step') == 'complete' and event.get('status') == 'done':
                output = event.get('output', {})
                if isinstance(output, dict) and output.get('success', False):
                    return True
        
        # 如果没有complete事件，检查是否有错误事件
        for event in events:
            if event.get('status') == 'error' or event.get('event') == 'error':
                logger.warning(f"发现错误事件: {event}")
                return False
        
        # 如果有export事件，也认为是成功的
        for event in events:
            if event.get('step') == 'export' and event.get('status') == 'done':
                return True
        
        return False
    
    def _parse_sse_response(self, response) -> Dict:
        """
        解析SSE流式响应
        
        Args:
            response: 响应对象
            
        Returns:
            Dict: 解析后的结果
        """
        # 使用流式方式读取SSE响应
        result = {
            'events': [],
            'thread_id': None,
            'turn_id': None,
            'output_file_id': None
        }
        
        line_count = 0
        # 逐行读取SSE响应
        for line in response.iter_lines(decode_unicode=True):
            if line:
                line_count += 1
                
                # 解析SSE数据行
                if line.startswith('data:'):
                    try:
                        # 处理可能的Unicode字符
                        data_str = line[5:].strip()
                        data = json.loads(data_str)
                        result['events'].append(data)
                        
                        # 提取关键信息
                        if 'thread_id' in data:
                            result['thread_id'] = data['thread_id']
                        if 'turn_id' in data:
                            result['turn_id'] = data['turn_id']
                        if 'output' in data:
                            output = data['output']
                            if isinstance(output, dict):
                                # 检查output中的file_id
                                if 'file_id' in output:
                                    result['output_file_id'] = output['file_id']
                                # 检查output_files中的file_id
                                elif 'output_files' in output:
                                    output_files = output['output_files']
                                    if output_files and len(output_files) > 0:
                                        file_info = output_files[0]
                                        if 'file_id' in file_info:
                                            result['output_file_id'] = file_info['file_id']
                                
                    except json.JSONDecodeError as e:
                        logger.warning(f"无法解析SSE数据 (行 {line_count}): {e}")
                        logger.debug(f"原始数据: {line[:100]}...")
                    except UnicodeDecodeError as e:
                        logger.warning(f"Unicode解码错误 (行 {line_count}): {e}")
                        # 尝试使用错误处理策略
                        try:
                            data_str = line[5:].strip().encode('utf-8', errors='ignore').decode('utf-8')
                            data = json.loads(data_str)
                            result['events'].append(data)
                        except:
                            logger.warning(f"无法修复Unicode错误，跳过该行")
        
        logger.info(f"SSE响应解析完成，收到 {len(result['events'])} 个事件，共 {line_count} 行")
        
        # 如果没有事件，记录警告
        if len(result['events']) == 0:
            logger.warning("SSE响应中没有解析到任何事件")
            # 尝试使用原始文本方式解析
            try:
                content = response.text
                if content:
                    logger.debug(f"原始响应内容: {content[:500]}...")
            except:
                logger.debug("无法获取原始响应内容")
        
        return result
    
    def download_result_file(self, file_url: str, output_path: Path) -> bool:
        """
        下载结果文件
        
        Args:
            file_url: 文件URL（从SSE响应中获取的public_url）
            output_path: 输出文件路径
            
        Returns:
            bool: 下载是否成功
        """
        try:
            logger.info(f"正在下载结果文件到: {output_path}")
            
            # 构建下载URL
            download_url = self._build_download_url(file_url)
            logger.debug(f"构建的下载URL: {download_url}")
            
            # 下载文件
            response = self.session.get(download_url, stream=True)
            
            if response.status_code == 200:
                with open(output_path, 'wb') as f:
                    for chunk in response.iter_content(chunk_size=8192):
                        f.write(chunk)
                
                file_size = output_path.stat().st_size
                logger.info(f"文件下载成功: {output_path} ({file_size} bytes)")
                return True
            else:
                logger.error(f"文件下载失败，状态码: {response.status_code}")
                logger.error(f"响应内容: {response.text[:200]}")
                
                # 如果使用MinIO直接访问失败，尝试使用API端点
                if self.use_minio_direct:
                    logger.info("MinIO直接访问失败，尝试使用API端点...")
                    # 回退到API端点
                    if file_url.startswith('/'):
                        api_download_url = f"{self.base_url}{file_url}"
                    else:
                        api_download_url = file_url
                    
                    if api_download_url != download_url:
                        logger.info(f"尝试API端点: {api_download_url}")
                        response = self.session.get(api_download_url, stream=True)
                        if response.status_code == 200:
                            with open(output_path, 'wb') as f:
                                for chunk in response.iter_content(chunk_size=8192):
                                    f.write(chunk)
                            
                            file_size = output_path.stat().st_size
                            logger.info(f"通过API端点下载成功: {output_path} ({file_size} bytes)")
                            return True
                
                return False
                
        except RequestException as e:
            logger.error(f"文件下载请求异常: {str(e)}")
            return False
        except Exception as e:
            logger.error(f"文件下载异常: {str(e)}")
            return False
    
    def _build_download_url(self, file_url: str) -> str:
        """
        构建下载URL
        
        Args:
            file_url: 原始文件URL
            
        Returns:
            str: 构建后的下载URL
        """
        # 如果启用了MinIO直接访问，并且URL以/storage/开头
        if self.use_minio_direct and file_url.startswith('/storage/'):
            # 将/storage/替换为MinIO端点
            # 例如: /storage/llm-excel/users/... -> http://localhost:9000/llm-excel/users/...
            minio_path = file_url[len('/storage/'):]
            download_url = f"{self.minio_endpoint}/{minio_path}"
            logger.debug(f"使用MinIO直接访问: {file_url} -> {download_url}")
            return download_url
        
        # 如果URL是相对路径，添加base_url前缀
        if file_url.startswith('/'):
            download_url = f"{self.base_url}{file_url}"
        else:
            download_url = file_url
        
        return download_url
    
    def _extract_output_file_info(self, sse_events: List[Dict]) -> Optional[Dict]:
        """
        从SSE事件中提取输出文件信息
        
        Args:
            sse_events: SSE事件列表
            
        Returns:
            Dict: 包含文件信息的字典，或None
        """
        logger.debug(f"开始提取文件信息，共有 {len(sse_events)} 个事件")
        
        # 首先查找export步骤
        for event in sse_events:
            if event.get('step') == 'export' and event.get('status') == 'done':
                logger.debug(f"找到export:done事件: {event}")
                output = event.get('output', {})
                if isinstance(output, dict) and 'output_files' in output:
                    output_files = output['output_files']
                    if output_files and len(output_files) > 0:
                        # 返回第一个输出文件的信息
                        file_info = output_files[0]
                        logger.debug(f"从export事件中提取到文件信息: {file_info}")
                        return {
                            'file_id': file_info.get('file_id'),
                            'filename': file_info.get('filename'),
                            'public_url': file_info.get('public_url'),
                            'download_url': file_info.get('download_url'),
                            'url': file_info.get('url')  # 也检查url字段
                        }
        
        # 如果没有找到export事件，尝试从complete事件中查找
        for event in sse_events:
            if event.get('step') == 'complete' and event.get('status') == 'done':
                logger.debug(f"找到complete:done事件: {event}")
                output = event.get('output', {})
                if isinstance(output, dict):
                    # 检查output_files字段
                    if 'output_files' in output:
                        output_files = output['output_files']
                        if output_files and len(output_files) > 0:
                            file_info = output_files[0]
                            logger.debug(f"从complete事件的output_files中提取到文件信息: {file_info}")
                            return {
                                'file_id': file_info.get('file_id'),
                                'filename': file_info.get('filename'),
                                'public_url': file_info.get('public_url'),
                                'download_url': file_info.get('download_url'),
                                'url': file_info.get('url')
                            }
                    # 检查是否有直接的文件信息
                    elif 'file_id' in output:
                        logger.debug(f"从complete事件的output中直接提取到文件信息: {output}")
                        return {
                            'file_id': output.get('file_id'),
                            'filename': output.get('filename'),
                            'public_url': output.get('public_url'),
                            'download_url': output.get('download_url'),
                            'url': output.get('url')
                        }
        
        # 如果还没有找到，检查所有事件的output字段
        for event in sse_events:
            output = event.get('output', {})
            if isinstance(output, dict):
                # 检查output_files字段
                if 'output_files' in output:
                    output_files = output['output_files']
                    if output_files and len(output_files) > 0:
                        file_info = output_files[0]
                        logger.debug(f"从任意事件的output_files中提取到文件信息: {file_info}")
                        return {
                            'file_id': file_info.get('file_id'),
                            'filename': file_info.get('filename'),
                            'public_url': file_info.get('public_url'),
                            'download_url': file_info.get('download_url'),
                            'url': file_info.get('url')
                        }
                # 检查是否有直接的文件信息
                elif 'file_id' in output:
                    logger.debug(f"从任意事件的output中直接提取到文件信息: {output}")
                    return {
                        'file_id': output.get('file_id'),
                        'filename': output.get('filename'),
                        'public_url': output.get('public_url'),
                        'download_url': output.get('download_url'),
                        'url': output.get('url')
                    }
        
        # 如果以上都没有找到，尝试更广泛的搜索
        # 检查所有事件中的所有可能包含文件信息的字段
        for i, event in enumerate(sse_events):
            # 检查event本身的字段（不仅仅是output）
            for field in ['file_id', 'filename', 'public_url', 'download_url', 'url', 'file_url', 'path']:
                if field in event:
                    logger.debug(f"从事件 #{i} 的{field}字段中提取到文件信息: {event[field]}")
                    return {
                        'file_id': event.get('file_id'),
                        'filename': event.get('filename'),
                        'public_url': event.get('public_url'),
                        'download_url': event.get('download_url'),
                        'url': event.get('url')
                    }
            
            # 检查data字段（如果有）
            if 'data' in event and isinstance(event['data'], dict):
                data = event['data']
                for field in ['file_id', 'filename', 'public_url', 'download_url', 'url', 'file_url', 'path']:
                    if field in data:
                        logger.debug(f"从事件 #{i} 的data.{field}字段中提取到文件信息: {data[field]}")
                        return {
                            'file_id': data.get('file_id'),
                            'filename': data.get('filename'),
                            'public_url': data.get('public_url'),
                            'download_url': data.get('download_url'),
                            'url': data.get('url')
                        }
        
        logger.warning("未在SSE事件中找到输出文件信息")
        logger.debug(f"SSE事件总数: {len(sse_events)}")
        for i, event in enumerate(sse_events):
            logger.debug(f"事件 #{i}: step={event.get('step')}, status={event.get('status')}, keys={list(event.keys())}")
            if 'output' in event and isinstance(event['output'], dict):
                logger.debug(f"     output_keys: {list(event['output'].keys())}")
        
        # 如果还是没有找到，尝试检查是否有其他格式的文件信息
        # 例如：文件信息可能在generate:done或execute:done事件中
        logger.debug("尝试在其他事件类型中查找文件信息...")
        for i, event in enumerate(sse_events):
            step = event.get('step')
            status = event.get('status')
            if status == 'done' and step in ['generate', 'execute', 'validate', 'load']:
                logger.debug(f"检查 {step}:{status} 事件: {event}")
        
        return None
    
    def _read_prompt_segments(self, prompt_path: Path, segment_index: int = 1) -> List[str]:
        """
        从prompt.txt文件中读取指定段落的提示词
        
        Args:
            prompt_path: 提示词文件路径
            segment_index: 段落索引（从1开始）
            
        Returns:
            List[str]: 该段落中的提示词列表（忽略第一行标题）
        """
        if not prompt_path.exists():
            logger.error(f"提示词文件不存在: {prompt_path}")
            return []
        
        try:
            with open(prompt_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # 按空行分割段落
            segments = content.strip().split('\n\n')
            
            if segment_index < 1 or segment_index > len(segments):
                logger.error(f"段落索引 {segment_index} 超出范围，文件共有 {len(segments)} 个段落")
                return []
            
            # 获取指定段落
            segment = segments[segment_index - 1]
            # 按行分割，过滤空行
            lines = [line.strip() for line in segment.strip().split('\n') if line.strip()]
            
            # 忽略第一行（标题行），只返回后面的提示词
            if len(lines) > 1:
                prompts = lines[1:]  # 跳过第一行标题
            else:
                prompts = []
            
            logger.info(f"从段落 {segment_index}/{len(segments)} 中读取到 {len(prompts)} 个提示词（已忽略标题行）")
            return prompts
            
        except Exception as e:
            logger.error(f"读取提示词文件失败: {str(e)}")
            return []
    
    def run_test_single_file(self, excel_file: str, prompt_file: str = "prompt.txt",
                             segment_index: int = 1, same_chat: bool = False) -> bool:
        """
        处理单个Excel文件的测试流程（不下载文件）
        
        Args:
            excel_file: Excel文件名
            prompt_file: 提示词文件名（默认: prompt.txt）
            segment_index: 提示词段落索引（从1开始）
            same_chat: 是否使用同一个chat窗口处理所有提示词（默认: False，每个提示词使用新窗口）
            
        Returns:
            bool: 处理是否成功
        """
        # 解析文件路径
        excel_path = Path(excel_file)
        if not excel_path.exists():
            logger.error(f"Excel文件不存在: {excel_path}")
            return False
        
        # 确定提示词文件
        prompt_path = Path(prompt_file)
        
        # 读取指定段落的提示词
        prompts = self._read_prompt_segments(prompt_path, segment_index)
        if not prompts:
            logger.error(f"无法读取段落 {segment_index} 的提示词")
            return False
        
        chat_mode = "同一个chat窗口" if same_chat else "新chat窗口"
        logger.info(f"处理文件 {excel_path.name}，找到 {len(prompts)} 个提示词，模式: {chat_mode}")
        
        # 1. 上传Excel文件
        file_id = self.upload_excel_file(excel_path)
        if not file_id:
            logger.error(f"文件 {excel_path.name} 上传失败")
            return False
        
        # 2. 处理每个提示词
        thread_id = None  # 用于保持同一个线程
        success_count = 0
        
        for i, prompt in enumerate(prompts, 1):
            logger.info(f"处理第 {i}/{len(prompts)} 个提示词（{chat_mode}）")
            
            # 根据same_chat参数决定是否传递thread_id
            if same_chat:
                # 使用同一个chat窗口：传递thread_id
                result = self.process_excel_with_prompt(file_id, prompt, thread_id)
                # 更新线程ID以便后续使用
                if result and result.get('thread_id'):
                    thread_id = result['thread_id']
            else:
                # 每个提示词使用新窗口：不传递thread_id
                result = self.process_excel_with_prompt(file_id, prompt, None)
            
            if result:
                # 检查处理是否成功
                if self._check_processing_success(result.get('events', [])):
                    success_count += 1
                    logger.info(f"第 {i} 个提示词处理成功（{chat_mode}）")
                else:
                    logger.warning(f"第 {i} 个提示词处理可能失败")
            else:
                logger.error(f"第 {i} 个提示词处理失败")
            
            # 添加延迟避免请求过快
            time.sleep(1)
        
        logger.info(f"文件 {excel_path.name} 处理完成，成功: {success_count}/{len(prompts)}，模式: {chat_mode}")
        return success_count == len(prompts)
    
    def run_test_sequence(self, start_pattern: str, prompt_file: str = "prompt.txt",
                          max_files: int = 48, same_chat: bool = False) -> bool:
        """
        顺序处理多个Excel文件
        
        Args:
            start_pattern: 起始文件模式（如"1_"）
            prompt_file: 提示词文件名（默认: prompt.txt）
            max_files: 最大文件数量（默认: 48）
            same_chat: 是否使用同一个chat窗口处理同一个文件的所有提示词（默认: False）
            
        Returns:
            bool: 所有文件处理是否成功
        """
        # 解析起始编号
        try:
            if start_pattern.endswith('_'):
                start_num = int(start_pattern[:-1])
            else:
                start_num = int(start_pattern)
        except ValueError:
            logger.error(f"无效的起始模式: {start_pattern}")
            return False
        
        # 确定提示词文件
        prompt_path = Path(prompt_file)
        if not prompt_path.exists():
            logger.error(f"提示词文件不存在: {prompt_path}")
            return False
        
        # 读取提示词文件，获取总段落数
        try:
            with open(prompt_path, 'r', encoding='utf-8') as f:
                content = f.read()
            total_segments = len(content.strip().split('\n\n'))
        except Exception as e:
            logger.error(f"读取提示词文件失败: {str(e)}")
            return False
        
        chat_mode = "同一个chat窗口" if same_chat else "新chat窗口"
        logger.info(f"提示词文件共有 {total_segments} 个段落，处理模式: {chat_mode}")
        
        # 1. 登录（只登录一次）
        if not self.login():
            logger.error("登录失败，无法继续测试")
            return False
        
        all_success = True
        
        # 2. 顺序处理每个文件
        for i in range(start_num, min(start_num + max_files, total_segments + 1)):
            # 查找以"i_"开头的Excel文件
            pattern = f"{i}_*.xlsx"
            matching_files = list(Path('.').glob(pattern))
            
            if not matching_files:
                logger.warning(f"未找到以 '{i}_' 开头的Excel文件，跳过")
                continue
            
            # 取第一个匹配的文件
            excel_path = matching_files[0]
            logger.info(f"找到文件: {excel_path.name}")
            
            logger.info(f"开始处理文件 {i}/{total_segments}: {excel_path.name}（{chat_mode}）")
            
            # 处理当前文件
            success = self.run_test_single_file(
                excel_file=str(excel_path),
                prompt_file=prompt_file,
                segment_index=i,
                same_chat=same_chat
            )
            
            if not success:
                all_success = False
                logger.error(f"文件 {excel_path.name} 处理失败")
            else:
                logger.info(f"文件 {excel_path.name} 处理成功")
            
            # 文件间添加延迟
            time.sleep(2)
        
        logger.info(f"顺序处理完成，起始模式: {start_pattern}，处理模式: {chat_mode}，结果: {'成功' if all_success else '有失败'}")
        return all_success
    
    def _generate_report(self, results: List[Dict], output_path: Path):
        """
        生成测试报告
        
        Args:
            results: 测试结果列表
            output_path: 输出目录
        """
        report_path = output_path / "test_report.json"
        
        try:
            with open(report_path, 'w', encoding='utf-8') as f:
                json.dump({
                    'timestamp': time.strftime('%Y-%m-%d %H:%M:%S'),
                    'total_tests': len(results),
                    'success_count': sum(1 for r in results if r['success']),
                    'failure_count': sum(1 for r in results if not r['success']),
                    'results': results
                }, f, ensure_ascii=False, indent=2)
            
            logger.info(f"测试报告已生成: {report_path}")
            
            # 同时生成简明的文本报告
            txt_report_path = output_path / "test_report.txt"
            with open(txt_report_path, 'w', encoding='utf-8') as f:
                f.write("=" * 60 + "\n")
                f.write("Excel处理自动化测试报告\n")
                f.write("=" * 60 + "\n\n")
                f.write(f"测试时间: {time.strftime('%Y-%m-%d %H:%M:%S')}\n")
                f.write(f"总测试数: {len(results)}\n")
                f.write(f"成功数: {sum(1 for r in results if r['success'])}\n")
                f.write(f"失败数: {sum(1 for r in results if not r['success'])}\n\n")
                
                f.write("详细结果:\n")
                f.write("-" * 60 + "\n")
                for result in results:
                    status = "✓ 成功" if result['success'] else "✗ 失败"
                    f.write(f"测试 {result['prompt_index']}: {status}\n")
                    f.write(f"提示词: {result['prompt'][:100]}...\n")
                    if result['success']:
                        f.write(f"输出文件: {result.get('output_file', 'N/A')}\n")
                    else:
                        f.write(f"错误: {result.get('error', '未知错误')}\n")
                    f.write("-" * 60 + "\n")
            
            logger.info(f"文本报告已生成: {txt_report_path}")
            
        except Exception as e:
            logger.error(f"生成测试报告失败: {str(e)}")


def main():
    """主函数"""
    parser = argparse.ArgumentParser(description='Excel处理自动化测试脚本')
    parser.add_argument('file_pattern', help='文件模式（如"1_"表示从1开始处理，或具体文件名如"1_AAPL.xlsx"）')
    parser.add_argument('--prompt-file', '-p', default='prompt.txt', help='提示词文件名（默认: prompt.txt）')
    parser.add_argument('--max-files', '-m', type=int, default=48, help='最大处理文件数（默认: 48）')
    parser.add_argument('--base-url', '-b', default='http://localhost:8000',
                       help='API基础URL（默认: http://localhost:8000）')
    parser.add_argument('--username', '-u', required=True, help='用户名')
    parser.add_argument('--password', '-w', required=True, help='密码')
    parser.add_argument('--minio-endpoint', '-e', default='http://localhost:9000',
                       help='MinIO端点URL（默认: http://localhost:9000）')
    parser.add_argument('--use-minio-direct', action='store_true',
                       help='直接访问MinIO下载文件（默认: 使用API端点）')
    parser.add_argument('--same-chat', '-s', action='store_true',
                       help='同一个文件的多个提示词使用同一个chat窗口（默认: 每个提示词使用新窗口）')
    
    args = parser.parse_args()
    
    # 创建测试工具实例
    tester = ExcelTestAutomation(
        base_url=args.base_url,
        username=args.username,
        password=args.password,
        minio_endpoint=args.minio_endpoint,
        use_minio_direct=args.use_minio_direct
    )
    
    # 判断是单个文件还是模式
    file_pattern = args.file_pattern
    
    if file_pattern.endswith('.xlsx'):
        # 单个文件处理模式
        chat_mode = "同一个chat窗口" if args.same_chat else "新chat窗口"
        logger.info(f"处理单个文件: {file_pattern}（{chat_mode}）")
        
        # 从文件名提取段落索引
        try:
            # 假设文件名格式为 "数字_名称.xlsx"，如 "1_AAPL.xlsx"
            basename = Path(file_pattern).stem  # "1_AAPL"
            segment_index = int(basename.split('_')[0])
        except (ValueError, IndexError):
            logger.warning(f"无法从文件名 {file_pattern} 提取段落索引，使用默认值1")
            segment_index = 1
        
        # 运行单个文件测试
        success = tester.run_test_single_file(
            excel_file=file_pattern,
            prompt_file=args.prompt_file,
            segment_index=segment_index,
            same_chat=args.same_chat
        )
    else:
        # 模式处理模式（如 "1_"）
        chat_mode = "同一个chat窗口" if args.same_chat else "新chat窗口"
        logger.info(f"按模式顺序处理文件: {file_pattern}（{chat_mode}）")
        
        # 运行顺序测试
        success = tester.run_test_sequence(
            start_pattern=file_pattern,
            prompt_file=args.prompt_file,
            max_files=args.max_files,
            same_chat=args.same_chat
        )
    
    # 返回退出码
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()