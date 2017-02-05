import {
  CopyTask,
  GenerateShrinkwrapTask,
  IBuildConfig,
  IExecutable,
  ValidateShrinkwrapTask,
  parallel,
  serial,
  task,
  watch
} from '@microsoft/gulp-core-build';
import { typescript, tslint } from '@microsoft/gulp-core-build-typescript';
import { sass } from '@microsoft/gulp-core-build-sass';
import { serve, reload } from '@microsoft/gulp-core-build-serve';
import { PostProcessSourceMaps } from './PostProcessSourceMaps';
import { mocha, instrument } from '@microsoft/gulp-core-build-mocha';
import { webpack } from '@microsoft/gulp-core-build-webpack';

export * from '@microsoft/gulp-core-build';
export * from '@microsoft/gulp-core-build-typescript';
export * from '@microsoft/gulp-core-build-sass';
export * from '@microsoft/gulp-core-build-serve';
export * from '@microsoft/gulp-core-build-mocha';
export * from '@microsoft/gulp-core-build-webpack';

export interface IRigConfig {
  /** (Optional) Task specifying what to run when serving. */
  serveTask?: IExecutable;
  /** @deprecated */
  bundleTask?: IExecutable;
};

let doNothingTask: IExecutable = {
  execute: (config: IBuildConfig) => Promise.resolve<void>(),
  isEnabled: () => false
}

let rigConfig: IRigConfig = {};
export const setRigConfig = (newRigConfig: IRigConfig) => { rigConfig = newRigConfig };

// pre copy and post copy allows you to specify a map of dest: [sources] to copy from one place to another.
export const preCopy: CopyTask = new CopyTask();
preCopy.name = 'pre-copy';

export const postCopy: CopyTask = new CopyTask();
postCopy.name = 'post-copy';

const sourceMatch: string[] = [
  'src/**/*.{ts,tsx,scss,js,txt,html}',
  '!src/**/*.scss.ts'
];

const serveTask = {
  execute: (buildConfig: IBuildConfig) => {
    if (rigConfig.serveTask && rigConfig.serveTask.isEnabled(buildConfig)) {
      return rigConfig.serveTask.execute(buildConfig);
    } else if (serve.isEnabled(buildConfig)) {
      return serve.execute(buildConfig);
    }

    return Promise.resolve<void>();
  }
};

// Define default task groups.
export const compileTsTasks: IExecutable = typescript;
export const buildTasks: IExecutable = task('build', serial(preCopy, sass, compileTsTasks, postCopy));
export const bundleTasks: IExecutable = task('bundle', serial(buildTasks, webpack));
export const testTasks: IExecutable = serial(sass, compileTsTasks, mocha);
export const defaultTasks: IExecutable = serial(buildTasks, webpack,  mocha);
export const postProcessSourceMapsTask: PostProcessSourceMaps = new PostProcessSourceMaps();
export const validateShrinkwrapTask: ValidateShrinkwrapTask = new ValidateShrinkwrapTask();
export const generateShrinkwrapTask: GenerateShrinkwrapTask = new GenerateShrinkwrapTask();

if (process.argv.indexOf('--fast') > -1) {
  task('test', serial(compileTsTasks, mocha));
} else {
  task('test', serial(compileTsTasks, instrument, mocha));
}

task('test-watch', watch(sourceMatch, serial(sass, compileTsTasks, mocha)));

task('validate-shrinkwrap', validateShrinkwrapTask);
task('generate', generateShrinkwrapTask);

// For watch scenarios like serve, make sure to exclude generated files from src (like *.scss.ts.)
task('serve',
  serial(
    buildTasks,
    serveTask,
    postProcessSourceMapsTask,
    watch(
      sourceMatch, serial(preCopy, sass, compileTsTasks,
        postCopy, postProcessSourceMapsTask, reload)
    )
  )
);

task('default', defaultTasks);
