pipeline {
  agent any

  options {
    disableConcurrentBuilds()
    timeout(time: 20, unit: 'MINUTES')
  }

  environment {
    // Adjust for your machine (Apple Silicon Homebrew path shown)
    PATH = "/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:${env.PATH}"
    CI = 'true'   // makes Vitest run once instead of starting watch mode
  }

  stages {
    stage('Setup') {
      steps {
        script {
          def nodeBin = sh(
            script: '''
              export NVM_DIR="$HOME/.nvm"
              . "$NVM_DIR/nvm.sh"
              nvm install >/dev/null
              dirname "$(nvm which current)"
            ''',
            returnStdout: true
          ).trim()
          env.PATH = "${nodeBin}:${env.PATH}"
        }
      }
    }

    stage('Lint') {
      steps { sh 'pnpm lint' }
    }

    stage('Build') {
      steps { sh 'pnpm build' }
    }

    stage('Test') {
      steps { sh 'pnpm test' }
    }
  }

  post {
    success {
      archiveArtifacts artifacts: 'dist/**', allowEmptyArchive: true
    }
  }
}