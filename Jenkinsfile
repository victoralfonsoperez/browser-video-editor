pipeline {
  agent any

  options {
    disableConcurrentBuilds()
    timeout(time: 20, unit: 'MINUTES')
  }

  environment {
    CI = 'true'   // makes Vitest run once instead of starting watch mode
  }

  stages {
    stage('Setup') {
      steps {
        sh '''
          set +x
          export NVM_DIR="$HOME/.nvm"
          . "$NVM_DIR/nvm.sh"
          nvm use || nvm install
          echo "Using node: $(command -v node)"
          dirname "$(command -v node)" > .node-bin
        '''
        script {
          env.PATH = "${readFile('.node-bin').trim()}:${env.PATH}"
        }
        sh 'node -v'
        sh 'corepack enable pnpm'
        sh 'pnpm -v'
        sh 'pnpm install --frozen-lockfile'
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