from setuptools import setup, find_packages

setup(
    name="privacy-audit-sdk",
    version="0.1.0",
    description="Client SDK for the Privacy Audit Service",
    author="VirtualBeetle",
    packages=find_packages(),
    python_requires=">=3.9",
    install_requires=[
        "httpx>=0.24.0",
    ],
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
    ],
)
