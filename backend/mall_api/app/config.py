"""商城服务环境变量。"""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str = "mysql+pymysql://tea:tea_pass@127.0.0.1:3306/tea_mall?charset=utf8mb4"

    wechat_appid: str = ""
    wechat_secret: str = ""

    jwt_secret: str = "MALL_JWT_CHANGE_ME_IN_PRODUCTION"
    jwt_algorithm: str = "HS256"
    jwt_expire_hours: int = 720


@lru_cache
def get_settings() -> Settings:
    return Settings()
