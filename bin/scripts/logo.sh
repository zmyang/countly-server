#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

if [ -f $DIR/../../plugins/plugins.ee.json ]; then

echo "
   ______                  __  __         ______      __                       _
  / ____/___  __  ______  / /_/ /_  __   / ____/___  / /____  _________  _____(_)_______
 / /   / __ \/ / / / __ \/ __/ / / / /  / __/ / __ \/ __/ _ \/ ___/ __ \/ ___/ / ___/ _ \\
/ /___/ /_/ / /_/ / / / / /_/ / /_/ /  / /___/ / / / /_/  __/ /  / /_/ / /  / (__  )  __/
\____/\____/\__,_/_/ /_/\__/_/\__, /  /_____/_/ /_/\__/\___/_/  / .___/_/  /_/____/\___/
              http://count.ly/____/                            /_/

";

else

echo "
   ______                  __  __
  / ____/___  __  ______  / /_/ /_  __
 / /   / __ \/ / / / __ \/ __/ / / / /
/ /___/ /_/ / /_/ / / / / /_/ / /_/ /
\____/\____/\__,_/_/ /_/\__/_/\__, /
              http://count.ly/____/
";

fi