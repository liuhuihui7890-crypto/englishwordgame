{ pkgs, ... }: {
  channel = "stable-24.05";

  packages = [
    pkgs.python311
    pkgs.python311Packages.pip
    pkgs.nodejs_20
  ];

  env = {};
  idx = {
    extensions = [
      "ms-python.python"
    ];
    workspace = {
      # 使用 onCreate 创建虚拟环境并安装依赖
      onCreate = {
        setup-venv = "python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt";
      };
      # 每次启动时自动激活（可选，但在终端仍需手动 source）
      onStart = {
        # install-deps = "pip install -r requirements.txt"; 
      };
    };
  };
}