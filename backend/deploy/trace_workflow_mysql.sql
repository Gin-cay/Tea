-- 溯源全流程：角色、批次、环节数据、留痕（MySQL 8+，utf8mb4）
-- 与 SQLAlchemy 模型表名一致；若已存在可由 create_all 跳过手工执行。

CREATE TABLE IF NOT EXISTS trace_sys_role (
  id INT NOT NULL AUTO_INCREMENT,
  role_name VARCHAR(64) NOT NULL,
  permissions TEXT NOT NULL,
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_trace_sys_role_name (role_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS trace_user_role (
  id INT NOT NULL AUTO_INCREMENT,
  user_id VARCHAR(32) NOT NULL,
  role_id INT NOT NULL,
  assign_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_trace_user_role (user_id, role_id),
  KEY ix_trace_user_role_user (user_id),
  CONSTRAINT fk_trace_user_role_user FOREIGN KEY (user_id) REFERENCES users (id),
  CONSTRAINT fk_trace_user_role_role FOREIGN KEY (role_id) REFERENCES trace_sys_role (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS trace_batch (
  id INT NOT NULL AUTO_INCREMENT,
  batch_no VARCHAR(64) NOT NULL,
  product_name VARCHAR(200) NOT NULL DEFAULT '信阳毛尖',
  create_user VARCHAR(64) NOT NULL DEFAULT '',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status INT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_trace_batch_no (batch_no),
  KEY ix_trace_batch_no (batch_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS trace_data (
  id INT NOT NULL AUTO_INCREMENT,
  batch_id VARCHAR(64) NOT NULL,
  process_type VARCHAR(32) NOT NULL,
  content TEXT NOT NULL,
  submit_user_id VARCHAR(32) NOT NULL,
  submit_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  audit_status INT NOT NULL DEFAULT 0,
  audit_user VARCHAR(64) NOT NULL DEFAULT '',
  audit_time DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_trace_data_batch_stage (batch_id, process_type),
  KEY ix_trace_data_batch (batch_id),
  KEY ix_trace_data_type (process_type),
  KEY ix_trace_data_submitter (submit_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS trace_data_log (
  id INT NOT NULL AUTO_INCREMENT,
  data_id INT NOT NULL,
  before_content TEXT NOT NULL,
  after_content TEXT NOT NULL,
  update_user VARCHAR(32) NOT NULL,
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reason VARCHAR(500) NOT NULL DEFAULT '',
  PRIMARY KEY (id),
  KEY ix_trace_data_log_data (data_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
