"""
环境变量配置（生产环境请通过 systemd / Docker 注入）。
"""

from functools import lru_cache
from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # 数据库：本地默认 sqlite；生产同机 MySQL 示例见 .env.example 与 DEPLOY_OPENCLOUDOS9.md
    database_url: str = "sqlite:///./tea_data.db"

    # JWT 会话（与小程序 storage 中 token 对应）
    jwt_secret: str = "CHANGE_ME_IN_PRODUCTION_USE_LONG_RANDOM_SECRET"
    jwt_algorithm: str = "HS256"
    jwt_expire_hours: int = 720  # 30 天

    # 微信小程序登录
    wechat_appid: str = ""
    wechat_secret: str = ""

    # 溯源码签名密钥（须与小程序 app.js globalData.traceTokenSecret 一致）
    trace_token_secret: str = "TEA_RED_TRACE_DEV_SECRET_REPLACE"

    # 上传文件对外访问基址（如 https://api.example.com），空则使用请求 Host 推导
    public_base_url: str = ""

    # 社区：新帖是否自动过审
    community_auto_approve: bool = True

    # 支付：真实商户参数齐全时走微信 V3；否则可看 README 使用开发桩
    wechat_mchid: str = ""
    wechat_pay_serial_no: str = ""
    wechat_pay_private_key_path: str = ""
    wechat_pay_apiv3_key: str = ""
    mini_program_appid: str = ""  # 通常与 wechat_appid 相同

    # 为 true 时 /pay/unified 返回可触发客户端支付 UI 的占位参数（真机仍会失败，仅联调用）
    dev_payment_stub: bool = False

    # 管理端 CRUD：请求头 X-Admin-Token；留空则管理接口全部 403
    admin_token: str = ""

    # 研学答题：满分 3，得分 ≥ 此值则颁发电子证书（可用环境变量 STUDY_QUIZ_PASS_MIN_SCORE=3 要求全对）
    study_quiz_pass_min_score: int = 2


@lru_cache
def get_settings() -> Settings:
    return Settings()
