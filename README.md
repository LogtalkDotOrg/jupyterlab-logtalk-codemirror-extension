# JupyterLab Logtalk CodeMirror Extension

A JupyterLab 4.x extension providing a Logtalk CodeMirror mode for syntax highlighting and automatic indentation plus launcher and command palette entries for creating new Logtalk files.

See also the [Jupyter kernel for Logtalk](https://github.com/LogtalkDotOrg/logtalk-jupyter-kernel).

🙏 Sponsored by [Permion](https://permion.ai/) and [GitHub Sponsors](https://github.com/sponsors/pmoura).

## Requirements

- JupyterLab >= 4.0.0

## Install

The extension is provided as a Python package on the Python Package Index and can be installed with `pip`:

	python3 -m pip install --upgrade jupyterlab-logtalk-codemirror-extension

## Uninstall

	python3 -m pip uninstall jupyterlab-logtalk-codemirror-extension

## Contributing

### Development install

After cloning the repository, install the extension in development mode:

	cd jupyterlab-logtalk-codemirror-extension
	python3 -m pip install -e .
	jupyter labextension develop . --overwrite

You can watch the source directory and run JupyterLab at the same time in different terminals to watch for changes in the extension's source and automatically rebuild the extension.

	jlpm watch
	jupyter lab

The `jlpm` command is JupyterLab's pinned version of [yarn](https://yarnpkg.com/) that is installed with JupyterLab. You may use `yarn` or `npm` in lieu of `jlpm` below.

With the watch command running, every saved change will immediately be built locally and available in your running JupyterLab. Refresh JupyterLab to load the change in your browser (you may need to wait several seconds for the extension to be rebuilt).

By default, the `jlpm build` command generates the source maps for this extension to make it easier to debug using the browser dev tools. To also generate source maps for the JupyterLab core extensions, you can run the following command:

	jupyter lab build --minimize=False

### Development uninstall

	python3 -m pip uninstall jupyterlab_logtalk_codemirror_extension

In development mode, you will also need to remove the symlink created by `jupyter labextension develop`
command. To find its location, you can run `jupyter labextension list` to figure out where the `labextensions`
folder is located. Then you can remove the symlink named `jupyterlab_logtalk_codemirror_extension` within that folder.

### Publishing

Make sure that both the `package.json` and `pyproject.toml` file report the same version. In the `twine` command below, replace `VERSION` with the actual version number (e.g., `1.0.0`).

	python3 -m build .
	twine upload jupyterlab_logtalk_codemirror_extension-VERSION.tar.gz and jupyterlab_logtalk_codemirror_extension-VERSION-py3-none-any.whl

The second command above requires you to be logged in to the PyPI registry. For the Conda registry, an automatic build and pull request is triggered when a new version is published on PyPI.
