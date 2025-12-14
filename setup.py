"""
WeWork Framework - A modular full-stack framework for building modern web applications
"""
from setuptools import setup, find_packages
from pathlib import Path

# Read README
readme_file = Path(__file__).parent / "README.md"
long_description = readme_file.read_text(encoding="utf-8") if readme_file.exists() else ""

# Read requirements
requirements_file = Path(__file__).parent / "requirements.txt"
requirements = []
if requirements_file.exists():
    requirements = [
        line.strip()
        for line in requirements_file.read_text(encoding="utf-8").splitlines()
        if line.strip() and not line.startswith("#")
    ]

setup(
    name="wework-framework",
    version="1.0.0",
    description="A modular full-stack framework for building modern web applications",
    long_description=long_description,
    long_description_content_type="text/markdown",
    author="WeWork Team",
    author_email="info@wework.dev",
    url="https://github.com/wecanco/wework-framework",
    packages=find_packages(exclude=["tests", "tests.*", "examples", "examples.*"]),
    include_package_data=True,
    install_requires=requirements,
    python_requires=">=3.9",
    entry_points={
        "console_scripts": [
            "wework=src.cli.main:cli",
        ],
    },
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Framework :: FastAPI",
        "Topic :: Software Development :: Libraries :: Application Frameworks",
    ],
    keywords="framework fastapi react fullstack web development",
    project_urls={
        "Documentation": "https://github.com/wecanco/wework-framework/docs",
        "Source": "https://github.com/wecanco/wework-framework",
        "Tracker": "https://github.com/wecanco/wework-framework/issues",
    },
)

